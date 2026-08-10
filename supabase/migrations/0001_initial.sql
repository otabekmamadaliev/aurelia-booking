-- =============================================================================
-- AURELIA — initial schema
--
-- The design problem this file solves is not "store some bookings". It is:
--
--   1. two guests pressing Confirm at the same instant must not both win, and
--   2. the browser must be able to compute availability without being handed
--      the guest list.
--
-- Everything below follows from those two.
-- =============================================================================


-- ---------------------------------------------------------------- rooms -----

create table if not exists public.rooms (
  id           text primary key,
  name         text        not null,
  tag          text,
  art          text,
  size         text,
  max_guests   integer     not null check (max_guests > 0),
  feature      text,
  rate         numeric(10, 2) not null check (rate >= 0),
  -- How many physical rooms of this type exist. The availability rules count
  -- against this, so it is the single number that decides how often a type can
  -- be sold for the same night.
  units        integer     not null default 1 check (units > 0),
  description  text,
  photo_small  text,
  photo_large  text,
  photo_alt    text,
  sort_order   integer     not null default 0
);

comment on column public.rooms.units is
  'Physical rooms of this type. Availability counts overlapping stays against it.';


-- ------------------------------------------------------------- bookings -----

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  reference   text        not null unique,
  room_id     text        not null references public.rooms (id) on delete restrict,
  -- Half-open: the stay owns [check_in, check_out). The checkout day is not a
  -- night, which is what makes back-to-back bookings legal.
  check_in    date        not null,
  check_out   date        not null,
  guests      integer     not null check (guests > 0),
  guest_name  text        not null,
  guest_email text,
  notes       text,
  total       numeric(10, 2),
  source      text        not null default 'guest'
                check (source in ('guest', 'staff', 'seed')),
  created_at  timestamptz not null default now(),

  constraint bookings_dates_ordered check (check_out > check_in)
);

-- The shape every availability question asks: "this room, overlapping these
-- dates". Without it the RPC below degrades to a sequential scan per night.
create index if not exists bookings_room_dates_idx
  on public.bookings (room_id, check_in, check_out);


-- ------------------------------------------------------- reference codes -----

-- No I, O, 0 or 1: the reference gets read down a phone line, and those four
-- are the pairs people mishear.
create or replace function public.new_booking_reference()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
begin
  for i in 1 .. 5 loop
    code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return 'AUR-' || code;
end;
$$;


-- ------------------------------------------------------ the booking write ----

-- create_booking is the only way a reservation enters the system.
--
-- Availability is re-checked *here*, inside the same transaction as the insert,
-- because everything the browser knows was computed from a snapshot that may
-- already be stale. The advisory lock is what makes it safe under real
-- concurrency: two requests for the same room type queue rather than both
-- reading the same free count and both inserting.
--
-- SECURITY DEFINER so anonymous guests can book without being granted any
-- direct write access to the bookings table.
create or replace function public.create_booking(
  p_room_id     text,
  p_check_in    date,
  p_check_out   date,
  p_guests      integer,
  p_guest_name  text,
  p_guest_email text default null,
  p_notes       text default null,
  p_source      text default 'guest'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room      public.rooms;
  v_peak      integer;
  v_nights    integer;
  v_reference text;
  v_booking   public.bookings;
  v_attempt   integer := 0;
begin
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in.'
      using errcode = 'check_violation';
  end if;

  if coalesce(btrim(p_guest_name), '') = '' then
    raise exception 'A name is required.'
      using errcode = 'check_violation';
  end if;

  if p_source not in ('guest', 'staff') then
    raise exception 'Bookings may only be created as guest or staff.'
      using errcode = 'check_violation';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'That room no longer exists.'
      using errcode = 'no_data_found';
  end if;

  if p_guests > v_room.max_guests then
    raise exception '% sleeps up to % guests.', v_room.name, v_room.max_guests
      using errcode = 'check_violation';
  end if;

  -- Serialise attempts for this room type for the rest of the transaction.
  -- Released automatically on commit or rollback, so a failure cannot wedge it.
  perform pg_advisory_xact_lock(hashtext(p_room_id));

  -- The busiest single night in the requested range. A stay needs the same
  -- physical room throughout, so one sold-out night in the middle makes the
  -- whole range unsellable — max(), never avg().
  select coalesce(max(taken), 0)
    into v_peak
    from (
      select count(b.id) as taken
        from generate_series(
               p_check_in,
               p_check_out - 1,
               interval '1 day'
             ) as night
        left join public.bookings b
               on b.room_id = p_room_id
              and b.check_in <= night::date
              and night::date < b.check_out
       group by night
    ) per_night;

  if v_peak >= v_room.units then
    raise exception '% is fully booked for those dates.', v_room.name
      using errcode = 'unique_violation';
  end if;

  v_nights := p_check_out - p_check_in;

  -- References are random, so a collision is possible if unlikely. Retry rather
  -- than fail a reservation over it.
  loop
    v_attempt := v_attempt + 1;
    v_reference := public.new_booking_reference();
    begin
      insert into public.bookings (
        reference, room_id, check_in, check_out, guests,
        guest_name, guest_email, notes, total, source
      )
      values (
        v_reference, p_room_id, p_check_in, p_check_out, p_guests,
        btrim(p_guest_name), nullif(btrim(coalesce(p_guest_email, '')), ''),
        nullif(btrim(coalesce(p_notes, '')), ''), v_nights * v_room.rate, p_source
      )
      returning * into v_booking;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  return v_booking;
end;
$$;


-- ------------------------------------------------------ cancelling ----------

-- A guest may cancel only a booking whose reference they can produce. The
-- reference is the proof of ownership, which is why it is required alongside
-- the id rather than the id being enough on its own.
create or replace function public.cancel_booking(
  p_id        uuid,
  p_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.bookings
   where id = p_id
     and reference = p_reference
     and source = 'guest';   -- house and desk bookings are staff-only
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;


-- ------------------------------------------------ row level security --------

alter table public.rooms    enable row level security;
alter table public.bookings enable row level security;

-- The catalogue is public.
drop policy if exists "rooms readable by everyone" on public.rooms;
create policy "rooms readable by everyone"
  on public.rooms for select
  using (true);

-- Bookings are NOT. There is deliberately no anonymous select policy: the guest
-- list contains names, e-mail addresses and notes, and a booking site has no
-- reason to hand that to every visitor. Guests get the PII-free view below.
drop policy if exists "staff read bookings" on public.bookings;
create policy "staff read bookings"
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists "staff write bookings" on public.bookings;
create policy "staff write bookings"
  on public.bookings for insert
  to authenticated
  with check (true);

drop policy if exists "staff delete bookings" on public.bookings;
create policy "staff delete bookings"
  on public.bookings for delete
  to authenticated
  using (true);


-- ------------------------------------------------ the availability view -----

-- What an anonymous visitor is allowed to know: which room is occupied on which
-- nights, and nothing about who is in it.
--
-- The view runs with its owner's rights (the default), so it can read a table
-- anon cannot. That is the point of it — it is the seam that lets the browser
-- compute availability precisely while the guest list stays private.
create or replace view public.availability as
  select id, room_id, check_in, check_out
    from public.bookings;

comment on view public.availability is
  'PII-free occupancy feed for the public booking engine. Intentionally runs with owner rights so anonymous clients can compute availability without reading guest details.';

-- ---------------------------------------------------------------- grants ----

-- Table-level privileges are a separate gate from row-level security: a policy
-- can only narrow what a role has already been granted, so without these the
-- policies above would decide nothing and every query would be refused.

grant select on public.rooms to anon, authenticated;

-- Anon is granted nothing on bookings at all. Guests reach it only through the
-- two SECURITY DEFINER functions and the PII-free view.
grant select, insert, delete on public.bookings to authenticated;

grant select on public.availability to anon, authenticated;

grant execute on function public.create_booking(text, date, date, integer, text, text, text, text)
  to anon, authenticated;
grant execute on function public.cancel_booking(uuid, text)
  to anon, authenticated;
