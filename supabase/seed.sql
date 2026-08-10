-- =============================================================================
-- AURELIA — sample data
--
-- Rooms are the commercial record: rate, capacity, units. Photographs stay as
-- bundled front-end assets keyed by room id, because Vite fingerprints them per
-- build and a URL stored here would rot on the next deploy. The photo_* columns
-- exist for when images move to object storage; the client prefers its bundled
-- asset and falls back to them.
--
-- Bookings are generated relative to CURRENT_DATE so the demo is never stale,
-- and mirror src/data/seedBookings.js — including its two full-house stretches
-- and the guests already in the house today.
-- =============================================================================

insert into public.rooms
  (id, name, tag, art, size, max_guests, feature, rate, units, description, sort_order)
values
  ('pine-single',   'Pine Single',    'Solo stay',        'r4', '18 m²', 1, 'Reading chair',  96, 2,
   'A small room done properly. Pine walls, a good mattress, and a window that opens onto the quiet side.', 1),
  ('forest-twin',   'Forest Twin',    'Good value',       'r5', '26 m²', 2, 'Twin beds',     142, 4,
   'Two beds under a dormer window, morning light across the floorboards, pines the whole way to the ridge.', 2),
  ('garden-suite',  'Garden Suite',   'Most loved',       'r1', '32 m²', 2, 'Garden terrace',158, 4,
   'Ground-floor suite opening onto the pine garden. Rain shower, reading nook, morning sun.', 3),
  ('attic-loft',    'Attic Loft',     'Under the beams',  'r6', '38 m²', 3, 'Wood stove',    186, 2,
   'The top of the old house — exposed beams, a stove that actually works, and a skylight for the weather.', 4),
  ('panorama-king', 'Panorama King',  'Mountain view',    'r2', '41 m²', 2, 'Balcony',       212, 3,
   'Floor-to-ceiling glass facing the ridge. King bed, deep bath, evenings worth staying in for.', 5),
  ('spa-suite',     'Spa Suite',      'Spa access',       'r7', '46 m²', 2, 'Private bath',  268, 2,
   'Deep soaking tub set into the window, robes by the door, and the sauna two floors down.', 6),
  ('family-chalet', 'Family Chalet',  'Sleeps five',      'r8', '64 m²', 5, 'Two bedrooms',  330, 1,
   'A whole floor for one family. Two bedrooms, a long sofa by the fire, and boots drying by the door.', 7),
  ('royal-villa',   'Royal Villa',    'Signature',        'r3', '78 m²', 4, 'Private pool',  440, 1,
   'A house of its own — two bedrooms, stone terrace, plunge pool, and total quiet.', 8)
on conflict (id) do update set
  name        = excluded.name,
  tag         = excluded.tag,
  art         = excluded.art,
  size        = excluded.size,
  max_guests  = excluded.max_guests,
  feature     = excluded.feature,
  rate        = excluded.rate,
  units       = excluded.units,
  description = excluded.description,
  sort_order  = excluded.sort_order;


-- Wipe only the sample bookings; anything a real guest made survives a reseed.
delete from public.bookings where source = 'seed';

do $$
declare
  today constant date := current_date;
  r     public.rooms;
  i     integer;
  s     record;
  -- Nights when the whole house is taken. These are what the public calendar
  -- strikes out, so they have to be genuinely full rather than merely busy.
  full_house constant int[][] := array[[6, 8], [25, 27]];
  block int[];
begin
  -- Every unit of every type, for each full-house stretch.
  foreach block slice 1 in array full_house loop
    for r in select * from public.rooms loop
      for i in 1 .. r.units loop
        insert into public.bookings
          (reference, room_id, check_in, check_out, guests, guest_name, total, source)
        values (
          public.new_booking_reference(), r.id,
          today + block[1], today + block[2], 2,
          case when block[1] = 6 then 'The Lindqvist wedding' else 'Alpine Forum' end,
          (block[2] - block[1]) * r.rate, 'seed'
        );
      end loop;
    end loop;
  end loop;

  -- Individual stays. `cnt` units of that type go at once, so cnt = units sells
  -- the type out for those nights.
  --
  -- None of these may run into nights 6-7 or 25-26: the full-house blocks
  -- already own every room then, and overlapping one would oversell the type.
  for s in
    select * from (values
      -- Already in the house, plus today's movements — without these the back
      -- office opens on an empty hotel, which is not what a working property
      -- looks like on any given morning.
      ('panorama-king', -2,  2, 1, 'W. Nakamura'),
      ('forest-twin',   -2,  3, 1, 'P. Dubois'),
      ('garden-suite',  -1,  1, 2, 'F. Rossi'),
      ('attic-loft',    -3,  0, 1, 'B. Novák'),
      ('spa-suite',      0,  4, 1, 'L. Chen'),
      ('pine-single',    0,  2, 1, 'K. Adeyemi'),

      ('garden-suite',   2,  5, 3, 'M. Okonkwo'),
      ('forest-twin',    3,  6, 4, 'S. Bergström'),
      ('panorama-king',  2,  4, 1, 'D. Aoyama'),
      ('royal-villa',    1,  4, 1, 'The Ferrante family'),
      ('spa-suite',      4,  6, 1, 'C. Almeida'),
      ('attic-loft',     9, 12, 2, 'J. Whitfield'),
      ('family-chalet', 10, 14, 1, 'The Ivanov party'),
      ('garden-suite',  12, 15, 2, 'R. Nowak'),
      ('panorama-king', 13, 16, 3, 'H. Takahashi'),
      ('forest-twin',   14, 17, 2, 'L. Moreau'),
      ('spa-suite',     16, 19, 2, 'A. Kowalczyk'),
      ('pine-single',   17, 20, 1, 'T. Bergman'),
      ('royal-villa',   18, 22, 1, 'N. Haddad'),
      ('attic-loft',    20, 23, 1, 'P. Andersen'),
      ('garden-suite',  21, 24, 4, 'The Reyes group'),
      ('family-chalet', 29, 33, 1, 'The Nakamura family'),
      ('forest-twin',   30, 33, 3, 'K. Solberg'),
      ('panorama-king', 31, 34, 2, 'E. Duarte')
    ) as t(room_id, from_offset, to_offset, cnt, guest)
  loop
    select * into r from public.rooms where id = s.room_id;
    for i in 1 .. s.cnt loop
      insert into public.bookings
        (reference, room_id, check_in, check_out, guests, guest_name, total, source)
      values (
        public.new_booking_reference(), s.room_id,
        today + s.from_offset, today + s.to_offset, 2, s.guest,
        (s.to_offset - s.from_offset) * r.rate, 'seed'
      );
    end loop;
  end loop;
end $$;


-- Fails loudly if the sample data ever oversells a room type. The front end has
-- a matching guard, but catching it at seed time means a bad demo never ships.
do $$
declare
  bad record;
begin
  select r.id, r.units, max(occupied.taken) as peak
    into bad
    from public.rooms r
    join lateral (
      select count(b.id) as taken
        from generate_series(current_date - 5, current_date + 40, interval '1 day') as night
        left join public.bookings b
               on b.room_id = r.id
              and b.check_in <= night::date
              and night::date < b.check_out
       group by night
    ) occupied on true
   group by r.id, r.units
  having max(occupied.taken) > r.units
   limit 1;

  if found then
    raise exception 'Seed data oversells %: % booked against % rooms',
      bad.id, bad.peak, bad.units;
  end if;
end $$;
