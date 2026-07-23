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
- **Party-aware search.** Rooms that cannot sleep the party are filtered out, and
  which nights are struck out changes with the guest count.
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
