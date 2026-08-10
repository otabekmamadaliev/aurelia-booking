# Connecting a Supabase project

Without this the app runs entirely in the browser — a complete demo with no
credentials. With it, reservations are shared across every device and the
no-double-booking guarantee is enforced by Postgres rather than by one tab.

Roughly ten minutes.

---

## 1. Create the project

At [supabase.com](https://supabase.com), create a project. Any region; the free
tier is enough. Note the database password somewhere safe — it is not needed
below, but it cannot be recovered.

## 2. Run the schema

Open **SQL Editor** in the project and run these two files in order:

1. `supabase/migrations/0001_initial.sql` — tables, the booking function,
   row-level security, and the public availability view.
2. `supabase/seed.sql` — the eight room types and sample reservations.

The seed ends with a self-check that raises if the sample data ever oversells a
room type, so a bad demo fails loudly at load time rather than looking fine
until someone opens the room chart.

Re-running `seed.sql` later refreshes the sample bookings and leaves real guest
reservations alone.

## 3. Point the app at it

**Settings → API** gives you two values. Put them in `.env`:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **Only ever the `anon` key.** It is designed to be public and can do exactly
> what row-level security permits. The `service_role` key on the same page
> bypasses RLS entirely — anything in a `VITE_*` variable is compiled into
> JavaScript that every visitor can read, so putting it there would hand the
> whole database to the internet.

For the deployed site, add the same two variables in **Vercel → Settings →
Environment Variables**, then redeploy. The app decides which backend to use at
build time, so a redeploy is required for the switch to take effect.

## 4. Create a staff account

Reservations are unreadable without a signed-in session — that is enforced by
the database, not the interface. Create the first staff user in
**Authentication → Users → Add user**, with a real email and a password.

Then sign in at `/admin`. The passcode form is replaced by email and password
as soon as a project is configured.

While you are there, turn **off** self-signup in **Authentication → Providers →
Email**, unless you want anyone able to register themselves a staff account.

---

## How to tell it worked

- `/admin` asks for an email and password rather than a passcode.
- The banner at the top of the back office is green and says *Connected to
  Postgres*, not amber.
- A booking made in one browser appears in another.

## What the database enforces

**Availability.** Reservations can only be created through `create_booking`,
which takes an advisory lock on the room type, recounts the busiest night in the
requested range, and inserts only if a unit is genuinely free — all in one
transaction. Two guests pressing Confirm in the same instant queue behind each
other rather than both reading the same free count. The browser's check is a
courtesy; this one is the guarantee.

**Privacy.** Anonymous visitors have no read access to `bookings` at all. They
read `availability`, a view of the same rows with the names, addresses and notes
removed, which is all the availability engine needs. The guest list is not
hidden by the front end — it is refused by the database.

## Cost

The free tier covers this comfortably. Projects pause after a week of
inactivity, which for a portfolio demo means the first visit after a quiet spell
is slow while it wakes. Leaving the credentials unset is a legitimate way to run
the demo — it simply falls back to the in-browser store.
