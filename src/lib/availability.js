import { nightsBetween, nightsInRange } from './date'

/**
 * Pure availability engine — no storage, no React, no dates-as-objects.
 *
 * Every function takes the full booking list as an argument rather than
 * reaching for it, which is what makes the same code usable on a server later:
 * hand it the rows a `SELECT` returned and the answers are identical.
 *
 * `unitsLeft` is the primitive everything else is expressed in terms of. Once a
 * room type can hold several physical rooms, "is it free?" stops being the
 * interesting question and "how many are left?" starts being it — availability,
 * scarcity and the struck-out nights in the calendar all fall out of the same
 * count.
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

/** How many units of one room type are occupied on a single night. */
function takenOn(bookings, roomId, night) {
  let count = 0
  for (const booking of bookings) {
    if (booking.roomId === roomId && booking.checkIn <= night && night < booking.checkOut) {
      count += 1
    }
  }
  return count
}

/**
 * How many units of this room type could still be sold for the whole range.
 *
 * This is the primitive the rest of the engine is built on. Counting against
 * `units` rather than testing for "any conflict at all" is what lets a room
 * type hold several physical rooms; with `units: 1` it degrades to the obvious
 * yes/no.
 *
 * The answer is the *fewest* free units on any single night, not the average:
 * a stay needs the same physical room for its whole length, so one sold-out
 * night in the middle makes the entire range unsellable. Checking night by
 * night is also what makes partial overlaps work — a booking that covers only
 * the back half of the range still blocks it.
 */
export function unitsLeft(room, bookings, checkIn, checkOut) {
  if (!isValidRange(checkIn, checkOut)) return 0
  const units = room.units ?? 1

  let fewest = units
  for (const night of nightsInRange(checkIn, checkOut)) {
    fewest = Math.min(fewest, units - takenOn(bookings, room.id, night))
    if (fewest <= 0) return 0
  }
  return fewest
}

/** Is at least one unit of this room free for the whole range? */
export function isRoomAvailable(room, bookings, checkIn, checkOut) {
  return unitsLeft(room, bookings, checkIn, checkOut) > 0
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
    const allFull = eligible.every(
      (room) => takenOn(bookings, room.id, night) >= (room.units ?? 1),
    )
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
