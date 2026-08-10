import { nightsBetween, nightsInRange } from './date'

/**
 * The numbers a hotelier actually runs the business on.
 *
 * Occupancy, ADR and RevPAR are the industry's three standard measures, and
 * they are defined precisely — getting them subtly wrong is worse than not
 * showing them, because a manager will make decisions on them. The definitions
 * used here are the conventional ones:
 *
 *   occupancy = room-nights sold ÷ room-nights available
 *   ADR       = room revenue ÷ room-nights **sold**
 *   RevPAR    = room revenue ÷ room-nights **available**
 *
 * The difference between ADR and RevPAR is the whole point of having both. ADR
 * says what you charge when you sell; RevPAR says what each room in the
 * building earned whether it sold or not. A hotel can lift ADR by selling less
 * at a higher price and go backwards — RevPAR is what catches that. The
 * identity `RevPAR = ADR × occupancy` falls out of the two definitions and is
 * asserted in the tests.
 *
 * Everything is measured over a half-open night range, the same convention the
 * availability engine uses.
 */

/** What a booking earns per night, preferring what was actually charged. */
function nightlyRate(booking, room) {
  const nights = nightsBetween(booking.checkIn, booking.checkOut)
  if (booking.total && nights > 0) return booking.total / nights
  return room?.rate ?? 0
}

/** Room-nights the house could theoretically sell across the range. */
export function capacity(rooms, fromISO, toISO) {
  const nights = nightsInRange(fromISO, toISO).length
  const units = rooms.reduce((sum, room) => sum + (room.units ?? 1), 0)
  return nights * units
}

/**
 * Occupancy, revenue, ADR and RevPAR over a range.
 *
 * Only the portion of each stay that falls *inside* the range counts, so a stay
 * straddling the boundary contributes its overlapping nights and no more —
 * otherwise a single long booking would inflate a one-day report.
 */
export function performance(rooms, bookings, fromISO, toISO) {
  const roomsById = new Map(rooms.map((room) => [room.id, room]))
  const window = new Set(nightsInRange(fromISO, toISO))

  let roomNightsSold = 0
  let revenue = 0

  for (const booking of bookings) {
    const room = roomsById.get(booking.roomId)
    const rate = nightlyRate(booking, room)

    for (const night of nightsInRange(booking.checkIn, booking.checkOut)) {
      if (!window.has(night)) continue
      roomNightsSold += 1
      revenue += rate
    }
  }

  const available = capacity(rooms, fromISO, toISO)

  return {
    available,
    roomNightsSold,
    revenue: Math.round(revenue),
    occupancy: available === 0 ? 0 : roomNightsSold / available,
    adr: roomNightsSold === 0 ? 0 : revenue / roomNightsSold,
    revpar: available === 0 ? 0 : revenue / available,
  }
}

/** Occupancy for each night, for the dashboard's forward-look bars. */
export function occupancyByNight(rooms, bookings, fromISO, toISO) {
  const units = rooms.reduce((sum, room) => sum + (room.units ?? 1), 0)

  return nightsInRange(fromISO, toISO).map((night) => {
    const sold = bookings.filter(
      (booking) => booking.checkIn <= night && night < booking.checkOut,
    ).length
    return { night, sold, units, occupancy: units === 0 ? 0 : sold / units }
  })
}

/** Reservations arriving on a given day. */
export function arrivalsOn(bookings, dateISO) {
  return bookings.filter((booking) => booking.checkIn === dateISO)
}

/** Reservations checking out on a given day. */
export function departuresOn(bookings, dateISO) {
  return bookings.filter((booking) => booking.checkOut === dateISO)
}

/**
 * Reservations occupying a room that night — arrivals included, departures not.
 * Someone leaving this morning is not in the house tonight, which is the same
 * half-open rule the availability engine uses.
 */
export function inHouseOn(bookings, dateISO) {
  return bookings.filter(
    (booking) => booking.checkIn <= dateISO && dateISO < booking.checkOut,
  )
}

/** Where a reservation sits relative to today, for the status column. */
export function statusOf(booking, todayISO) {
  if (booking.checkOut <= todayISO) return 'past'
  if (booking.checkIn > todayISO) return 'upcoming'
  return 'in-house'
}
