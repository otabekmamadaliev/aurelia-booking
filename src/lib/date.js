/**
 * Date helpers.
 *
 * Everything in this app moves dates around as plain `YYYY-MM-DD` strings —
 * never as `Date` objects and never as timestamps. A hotel night is a calendar
 * concept, not an instant in time: "12 September" means the same night whether
 * the guest books it from Warsaw or from Tokyo. Keeping the wire format as a
 * local calendar string sidesteps every timezone and DST bug in this class of
 * app, and it is also exactly what a SQL `DATE` column would hand back.
 */

const MS_PER_DAY = 86400000

/** Date object -> 'YYYY-MM-DD' (in the viewer's local calendar). */
export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' -> Date at local midnight. */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today() {
  return toISO(new Date())
}

export function addDays(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/**
 * Number of nights between two dates. Rounded because a DST boundary makes the
 * raw millisecond difference 23 or 25 hours instead of 24.
 */
export function nightsBetween(fromISODate, toISODate) {
  return Math.round((fromISO(toISODate) - fromISO(fromISODate)) / MS_PER_DAY)
}

/**
 * The nights a stay actually occupies: `[checkIn, checkOut)`.
 * Checkout day is not a night — that is what makes back-to-back bookings on the
 * same room legal, and it is the single most common off-by-one in booking code.
 */
export function nightsInRange(checkIn, checkOut) {
  const nights = []
  let cursor = checkIn
  while (cursor < checkOut) {
    nights.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return nights
}

/** 'Fri, 12 Sep' */
export function formatShort(iso) {
  if (!iso) return ''
  return fromISO(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** 'Friday, 12 September 2026' — used for screen readers and the email body. */
export function formatLong(iso) {
  if (!iso) return ''
  return fromISO(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** 'September 2026' */
export function formatMonth(iso) {
  return fromISO(iso).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso) {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(iso, n) {
  const d = fromISO(startOfMonth(iso))
  d.setMonth(d.getMonth() + n)
  return toISO(d)
}

/**
 * A 6x7 calendar grid for the month containing `iso`, Monday-first.
 * Always 42 cells so the popover never changes height between months.
 */
export function monthGrid(iso) {
  const first = fromISO(startOfMonth(iso))
  const offset = (first.getDay() + 6) % 7 // JS weeks start Sunday; ours start Monday
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(first)
    d.setDate(1 - offset + i)
    cells.push({
      iso: toISO(d),
      day: d.getDate(),
      inMonth: d.getMonth() === first.getMonth(),
    })
  }
  return cells
}
