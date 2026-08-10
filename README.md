# AURELIA — Boutique Hotel & Spa

A hotel booking demo built around a real availability engine: pre-seeded
reservations block specific nights per room, no two stays can ever hold the same
room on the same night, and prices are computed from the dates you actually
picked.

**Live:** _pending deploy_ · **Stack:** React 19 · Vite · Framer Motion · EmailJS

---

## What it does

- **Date-range picker with live availability.** Nights where every suitable room
  is taken are struck out and cannot be chosen as an arrival date — though they
  _can_ be a departure date, because checking out in the morning does not occupy
  that night. A range is rejected outright if it would span a fully-booked night.
- **No double-booking.** Availability is re-verified at write time, not just at
  render time, so a room taken in another tab cannot be booked twice.
- **Real inventory.** Eight room types holding **19 physical rooms** between
  them — the number in the hero copy is summed from the data, not typed. Most
  types have several units, so booking one decrements the count rather than
  selling the type out, and "2 of 3 left" is derived from what is actually
  unsold.
- **Honest scarcity.** A warning appears only once units have genuinely sold. A
  type sitting at full inventory never says "only 2 left", however few rooms it
  has — the manufactured-urgency trick this kind of site is usually caught doing.
- **Party-aware search.** Rooms that cannot sleep the party are filtered out,
  which nights are struck out changes with the guest count, and the grid puts
  bookable rooms first so a party of five never has to expand a list to find the
  one room that fits them.
- **Search with a real round-trip.** Pressing Search re-reads availability
  behind a skeleton loading state. The latency lives in the repository, not in a
  component — it is where a network call would actually be, and it disappears on
  its own when this talks to a real backend.
- **Live price.** `nights × nightly rate`, recomputed on every date change.
- **Confirmation e-mail** to the guest, with a copy to the hotel.
- **Persists in `localStorage`,** so the demo remembers your reservations between
  visits. Seeded house bookings refresh themselves if the data goes stale.

## Photography

Rooms carry their own images (`photo.small` / `photo.large` on each row in
`src/data/rooms.js`), so the same photograph feeds the room card and the
thumbnail in the booking modal, and a `rooms` table storing image URLs would
drop straight in.

The gradients from the original design are still there, one layer down: they
are the placeholder that shows while a photo loads, and what you keep looking
at if a photo never arrives. Nothing renders as an empty box.

All images are WebP, cut to the widths the layout actually uses (~740 KB for
the whole page), with `srcset` on the hero and room images. See
[CREDITS.md](CREDITS.md) for photographers and licence.

## Back office

`/admin` — passcode `aurelia`.

Guests use a booking page once; staff live in the back office every day, so it
is a different application that happens to read the same data. It has its own
`useAdminData` hook rather than sharing the guest context, because the two need
opposite things: a guest has a search and a party size, staff need to cancel
somebody else's reservation.

- **Dashboard** — occupancy tonight and across 30 days, **ADR**, **RevPAR**,
  rooms revenue, a fourteen-night forward look, and today's arrivals,
  departures and in-house list.
- **Room chart** — the tape chart, 19 physical rooms down the side against 14
  nights. This is why `allocation.js` exists: the booking side sells room
  *types*, but a chart has to show room 2 of 4, because that is what
  housekeeping cleans and what the guest is handed a key to.
- **Reservations** — search across name, reference and email at once (the desk
  does not know which one the caller will read out), filter by status, cancel.

Two honest limits, stated in the UI as well as here:

- **The passcode is not security.** It is compared in the browser, so anyone can
  read it out of the bundle. It exists to keep the back office out of the way
  and to mark where real authentication attaches. A login screen that implied
  real protection would be worse than none.
- **Nothing is shared between devices.** Every reservation still lives in one
  browser's `localStorage`. Until that changes this is a working simulation of
  hotel software, not hotel software.

## Accessibility & motion

- Full keyboard support in the calendar: arrows move day by day, `PageUp` /
  `PageDown` move by month, `Home` / `End` jump to the ends of the week.
- The reservation dialog traps focus, closes on `Escape`, and returns focus to
  whatever opened it. Popovers do the same.
- Form errors are wired up with `aria-invalid` / `aria-describedby`, and focus
  moves to the first invalid field on submit.
- `prefers-reduced-motion: reduce` disables the scroll reveals, the dialog
  transitions, the slow drift across the hero photographs and all hover
  transforms — the animations are skipped, not merely shortened.

## Running it

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Tests

```bash
npm test
```

77 tests over the engine and the write path — the parts where being wrong means
selling a room twice. They run on every push and pull request via GitHub
Actions, alongside lint and build.

The suite is deliberately concentrated on boundaries rather than coverage
percentage:

- **The half-open night range.** Checking out on the 15th and arriving on the
  15th must both succeed; sharing a single night must not.
- **`unitsLeft` answering with the worst night, not the average.** A room free
  on two nights of a three-night stay is not sellable, and an averaging
  implementation would cheerfully double-book it.
- **Partial overlaps** at the head and the tail of a range.
- **DST.** `nightsBetween` across a spring-forward boundary, where the raw
  millisecond difference is 23 hours a day and an unrounded result turns a
  three-night stay into a two-night charge.
- **`create` refusing**, since that is the only place that actually can — it
  re-reads stored state rather than trusting the total it was handed.

They were checked by mutation rather than by going green: inverting the overlap
comparison fails 2 tests, swapping `Math.min` for `Math.max` in `unitsLeft`
fails 14, and moving the night boundary by one day fails 5.

## Architecture

```
src/
  data/                 room catalogue + seeded reservations (plain data, no logic)
  lib/date.js           calendar-string date helpers — no Date objects on the wire
  lib/availability.js   pure availability + pricing engine
  lib/repository.js     the only module that knows where data is stored
  lib/email.js          EmailJS delivery
  state/                one context holding search, results and wizard state
  components/           presentation
```

### Swapping the storage layer

`src/lib/repository.js` is the seam. Both repositories are already `async` and
already return plain serialisable rows, so replacing localStorage with a real
backend means rewriting that one file — every caller awaits, and every caller
already handles a rejected write.

Two details live in the repository rather than in the UI, because they are the
parts a server would own:

- `create()` re-reads state and re-checks availability before writing, the same
  last-line-of-defence check a serializable transaction would perform;
- booking references are minted at write time, not in a component.

Dates travel as `YYYY-MM-DD` strings throughout, which is exactly what a SQL
`DATE` column returns — no conversion layer needed.

`rooms.units` already exists on every room: the engine counts overlapping
bookings against it, so a room type holding four physical rooms works by
changing one number.

## Configuration

Confirmation e-mail delivery works out of the box with values baked into
`src/lib/email.js` (EmailJS public keys are publishable by design). To point a
deployment at a different account, copy `.env.example` to `.env` and set the
`VITE_EMAILJS_*` variables.

---

Design and build by [Otabek Mamadaliev](https://otabekmamadaliev.com). Aurelia is
a fictional hotel; every reservation in it is demo data.
