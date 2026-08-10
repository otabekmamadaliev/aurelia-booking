import { nightsInRange } from './date'
import { rangesOverlap } from './availability'

/**
 * Assigning reservations to physical rooms.
 *
 * The booking side of this app deliberately never picks a room — a guest buys
 * "a Garden Suite", not room 3. Staff, however, cannot work that way: a tape
 * chart has one row per physical room, housekeeping cleans numbered rooms, and
 * a guest at the desk is handed one specific key. This module is the bridge.
 *
 * The rule that matters: a stay keeps the *same* physical room for its whole
 * length. Splitting a guest across two rooms mid-stay is technically an
 * allocation but nobody would accept it, so a unit is only free for a booking
 * if it is free for every night of it.
 *
 * First-fit by arrival date, which is what a front desk does by hand: take the
 * next arrival, give it the lowest-numbered room that is free for the whole
 * stay. Deterministic, so the tape chart does not reshuffle itself between
 * renders.
 */

/** Stable label for a physical room, 1-indexed the way staff would say it. */
export function unitLabel(room, index) {
  return room.units > 1 ? `${room.name} ${index + 1}` : room.name
}

/**
 * Every physical room in the house, in catalogue order.
 * This is the row list for the tape chart.
 */
export function physicalUnits(rooms) {
  const units = []
  for (const room of rooms) {
    for (let index = 0; index < (room.units ?? 1); index++) {
      units.push({
        key: `${room.id}#${index}`,
        roomId: room.id,
        room,
        index,
        label: unitLabel(room, index),
      })
    }
  }
  return units
}

/**
 * Map every booking onto a physical unit.
 *
 * Returns `{ byBooking, byUnit, unplaced }`. `unplaced` should always be empty:
 * a booking that cannot be placed means more stays were sold than the type has
 * rooms, which the availability engine is supposed to make impossible. It is
 * surfaced rather than swallowed precisely so that a bug there becomes visible
 * to staff instead of silently losing a reservation off the chart.
 */
export function allocate(rooms, bookings) {
  const byBooking = new Map()
  const byUnit = new Map()
  const unplaced = []

  for (const room of rooms) {
    const units = room.units ?? 1
    for (let index = 0; index < units; index++) {
      byUnit.set(`${room.id}#${index}`, [])
    }

    const forRoom = bookings
      .filter((booking) => booking.roomId === room.id)
      // Arrival order, then a stable tiebreak so equal arrivals never swap.
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.id.localeCompare(b.id))

    for (const booking of forRoom) {
      let placed = false

      for (let index = 0; index < units; index++) {
        const key = `${room.id}#${index}`
        const occupants = byUnit.get(key)

        const collides = occupants.some((other) =>
          rangesOverlap(other.checkIn, other.checkOut, booking.checkIn, booking.checkOut),
        )

        if (!collides) {
          occupants.push(booking)
          byBooking.set(booking.id, { key, roomId: room.id, index, room })
          placed = true
          break
        }
      }

      if (!placed) unplaced.push(booking)
    }
  }

  return { byBooking, byUnit, unplaced }
}

/**
 * Which unit each booking sits in, keyed for quick lookup by night.
 * Used by the tape chart to decide what to draw in a given cell.
 */
export function occupancyGrid(rooms, bookings, fromISO, toISO) {
  const { byUnit } = allocate(rooms, bookings)
  const nights = nightsInRange(fromISO, toISO)
  const grid = new Map()

  for (const [key, occupants] of byUnit) {
    const row = new Map()
    for (const booking of occupants) {
      for (const night of nightsInRange(booking.checkIn, booking.checkOut)) {
        row.set(night, booking)
      }
    }
    grid.set(
      key,
      nights.map((night) => ({ night, booking: row.get(night) ?? null })),
    )
  }

  return { nights, grid }
}
