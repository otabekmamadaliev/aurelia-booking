# aurelia-booking

AURELIA — boutique hotel booking demo, built around a real availability engine.
Live at **https://aurelia-booking.vercel.app**. Repo:
`github.com/otabekmamadaliev/aurelia-booking`.

## Where this lives

`C:\Users\ASUS\Desktop\aurelia-booking`, alongside the other projects. It was
moved here from `Downloads` on 2026-08-28 — older notes may still point there.
The `aurelia` entry in `Desktop/.claude/launch.json` (port 5174) works again now
that the path resolves.

## Stack

React 19 + Vite 8, **plain JavaScript**, plain CSS (`src/styles.css` plus
`src/admin/admin.css`). `react-router-dom` for routing, `framer-motion` for
motion, `@emailjs/browser` for confirmations, `@supabase/supabase-js` for the
optional shared backend. **Vitest** for tests — this is the only one of the four
projects with a real test suite, so use it.

## The storage seam — the most important thing here

`src/lib/repository.js` is a **seam**, and it is load-bearing. Every caller
imports `roomRepository` / `bookingRepository` from it and nothing else.

- No Supabase env vars → `repository.local.js`, backed by `localStorage`. A
  fresh clone runs the whole demo with no credentials and no network.
- Supabase configured → `repository.supabase.js`, loaded by **dynamic import**
  so the ~26 kB client never enters the bundle of the credential-free demo.

**Do not import `supabaseClient.js` from anything the guest bundle reaches.** Ask
`backend.js` (which has zero imports on purpose) whether a project is configured;
only import the client once the answer is yes. A single careless static import
drags the whole library into every page load.

Callers already `await` and already treat "unavailable" as a thrown error, which
is why adding Postgres changed none of them. Keep it that way.

## Supabase status

The integration is **written but not pointed at a live project.** `supabase/migrations/0001_initial.sql`,
`supabase/seed.sql` and `docs/SUPABASE.md` all exist. What is missing is a real
project plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

Otabek has **deferred this until a client actually asks for it** — do not start
wiring it unprompted. When it resumes, `docs/SUPABASE.md` is the guide.

The anon key is public by design and safe in a client bundle; RLS is what
constrains it. **`service_role` must never appear in a `VITE_*` variable** — those
are compiled into JavaScript anyone can read.

## Domain rules that look like bugs but are not

- A fully-booked night **cannot be an arrival date but can be a departure date** —
  checking out in the morning does not occupy that night.
- Room *types* hold multiple physical units (8 types, 19 rooms). Booking one
  decrements a count rather than selling the type out.
- Scarcity warnings appear **only once units have genuinely sold**. A type at full
  inventory never says "only 2 left" — refusing the manufactured-urgency trick is
  deliberate, do not "fix" it.
- Availability is re-verified **at write time**, not just at render time, so a room
  taken in another tab cannot be double-booked.

## Rules

- **Branch + PR into `main`. Never commit directly to main.**
- `C:\Users\ASUS` is itself a git repo with an unborn `main` — running git from
  the wrong cwd silently operates on the home directory. Always `cd` here first.
- Verify with `npm run build`, `npx oxlint src`, **and `npm test`** (vitest).
  The engine files — `availability`, `allocation`, `date`, `metrics` — all have
  tests. If you change one, the test suite is the check that matters.

## Note

The hero's availability grid on **otabekmamadaliev.com** is a miniature
reimplementation of this engine (`Engine.jsx` in the portfolio repo). It is a
separate ~100-line copy, not shared code — changes here do not propagate there.
