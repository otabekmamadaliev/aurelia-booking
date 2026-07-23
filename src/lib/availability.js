import { nightsBetween, nightsInRange } from './date'

/**
 * Pure availability engine — no storage, no React, no dates-as-objects.
 *
 * Every function takes the full booking list as an argument rather than
 * reaching for it, which is what makes the same code usable on a server later:
 * hand it the rows a `SELECT` returned and the answers are identical.
 */

/**
 * Do two stays collide?
 *
 * Half-open intervals: a stay owns `[checkIn, checkOut)`. Someone checking out
 * on the 15th and someone checking in on the 15th do not overlap — the strict
 * comparisons on both sides are what allows that.
 */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

export function isValidRange(checkIn, checkOut) {
  return Boolean(checkIn) && Boolean(checkOut) && checkOut > checkIn
}

/** Bookings for one room that collide with the given range. */
export function conflictsFor(bookings, roomId, checkIn, checkOut) {
  return bookings.filter(
    (booking) =>
      booking.roomId === roomId &&
      rangesOverlap(booking.checkIn, booking.checkOut, checkIn, checkOut),
  )
}

/**
 * Is at least one unit of this room free for the whole range?
 *
 * Counting conflicts against `units` rather than testing for "any conflict at
 * all" is what lets a room type hold several physical rooms. With `units: 1`
 * it degrades to the obvious rule: one conflict means unavailable.
 */
export function isRoomAvailable(room, bookings, checkIn, checkOut) {
  if (!isValidRange(checkIn, checkOut)) return false
  const units = room.units ?? 1

  // A single conflicting booking may span only part of the range, so capacity
  // has to be checked night by night rather than across the range as a whole.
  return nightsInRange(checkIn, checkOut).every((night) => {
    const takenThatNight = bookings.filter(
      (booking) =>
        booking.roomId === room.id &&
        booking.checkIn <= night &&
        night < booking.checkOut,
    ).length
    return takenThatNight < units
  })
}

/** Rooms that fit the party and are free for the whole range. */
export function availableRooms(rooms, bookings, checkIn, checkOut, guests) {
  return rooms.filter(
    (room) =>
      room.maxGuests >= guests &&
      isRoomAvailable(room, bookings, checkIn, checkOut),
  )
}

/** Rooms that fit the party but are already taken for the range. */
export function unavailableRooms(rooms, bookings, checkIn, checkOut, guests) {
  return rooms.filter(
    (room) =>
      room.maxGuests >= guests &&
      !isRoomAvailable(room, bookings, checkIn, checkOut),
  )
}

/**
 * Nights on which *nothing* suitable is left — the ones the calendar strikes
 * out. A night is only blocked when every room big enough for the party is
 * full, which is why the party size has to be part of the question.
 */
export function fullyBookedNights(rooms, bookings, guests, fromISODate, toISODate) {
  const eligible = rooms.filter((room) => room.maxGuests >= guests)
  const blocked = new Set()
  if (eligible.length === 0) return blocked

  for (const night of nightsInRange(fromISODate, toISODate)) {
    const allFull = eligible.every((room) => {
      const units = room.units ?? 1
      const taken = bookings.filter(
        (booking) =>
          booking.roomId === room.id &&
          booking.checkIn <= night &&
          night < booking.checkOut,
      ).length
      return taken >= units
    })
    if (allFull) blocked.add(night)
  }
  return blocked
}

/** Does this range try to span a night nobody can sell? */
export function rangeCrossesBlockedNight(checkIn, checkOut, blockedNights) {
  return nightsInRange(checkIn, checkOut).some((night) => blockedNights.has(night))
}

/** nights × nightly rate. The demo has no taxes or fees — the total is the total. */
export function priceFor(room, checkIn, checkOut) {
  if (!room || !isValidRange(checkIn, checkOut)) {
    return { nights: 0, rate: room?.rate ?? 0, total: 0 }
  }
  const nights = nightsBetween(checkIn, checkOut)
  return { nights, rate: room.rate, total: nights * room.rate }
}

/** The cheapest bookable room for a range — drives the "Total from" cell. */
export function cheapestOption(rooms, bookings, checkIn, checkOut, guests) {
  const options = availableRooms(rooms, bookings, checkIn, checkOut, guests)
  if (options.length === 0) return null
  const room = options.reduce((min, r) => (r.rate < min.rate ? r : min))
  return { room, ...priceFor(room, checkIn, checkOut) }
}
