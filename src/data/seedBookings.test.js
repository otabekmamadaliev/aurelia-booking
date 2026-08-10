import { describe, expect, it } from 'vitest'
import { seedBookings } from './seedBookings'
import { ROOMS, TOTAL_UNITS } from './rooms'
import { allocate } from '../lib/allocation'
import { unitsLeft } from '../lib/availability'
import { addDays, nightsInRange } from '../lib/date'

/**
 * The demo data is content, but it is content the engine has to be able to
 * satisfy — and it is hand-written, which makes it exactly the kind of thing
 * that drifts.
 *
 * This caught a real one: a spa stay ran into the nights the full-house block
 * already owned, selling a two-room type three times over. The public site hid
 * it (it only ever asks "is anything left?", and the answer was still no), but
 * the back office could not place the third reservation on the chart.
 */
const ANCHOR = '2026-08-10'

describe('seedBookings', () => {
  const bookings = seedBookings(ANCHOR)

  it('produces bookings that all reference a real room', () => {
    const ids = new Set(ROOMS.map((room) => room.id))
    expect(bookings.every((booking) => ids.has(booking.roomId))).toBe(true)
  })

  it('gives every booking a distinct id and reference', () => {
    expect(new Set(bookings.map((b) => b.id)).size).toBe(bookings.length)
    expect(new Set(bookings.map((b) => b.reference)).size).toBe(bookings.length)
  })

  it('never oversells a room type', () => {
    // The property that matters: every seeded stay can be given a physical
    // room. `unplaced` is the allocator reporting that it could not.
    const { unplaced } = allocate(ROOMS, bookings)
    expect(
      unplaced.map((b) => `${b.roomId} ${b.checkIn}->${b.checkOut}`),
    ).toEqual([])
  })

  it('never leaves a room type with negative availability on any night', () => {
    // Belt and braces, and phrased the way the booking side would ask.
    for (const room of ROOMS) {
      for (const night of nightsInRange(addDays(ANCHOR, -5), addDays(ANCHOR, 40))) {
        const left = unitsLeft(room, bookings, night, addDays(night, 1))
        expect(left).toBeGreaterThanOrEqual(0)
        expect(left).toBeLessThanOrEqual(room.units)
      }
    }
  })

  it('fills the house completely on the full-house nights', () => {
    // These are the nights the public calendar strikes out, so they have to be
    // genuinely full — not merely busy.
    for (const offset of [6, 7, 25, 26]) {
      const night = addDays(ANCHOR, offset)
      const sold = bookings.filter((b) => b.checkIn <= night && night < b.checkOut)
      expect(sold).toHaveLength(TOTAL_UNITS)
    }
  })

  it('leaves rooms free on a night that is not part of a block', () => {
    // If everything were full the demo would show a permanently sold-out hotel.
    const night = addDays(ANCHOR, 10)
    const sold = bookings.filter((b) => b.checkIn <= night && night < b.checkOut)
    expect(sold.length).toBeLessThan(TOTAL_UNITS)
  })

  it('puts guests in the house today, so the back office is not empty', () => {
    const inHouse = bookings.filter((b) => b.checkIn <= ANCHOR && ANCHOR < b.checkOut)
    expect(inHouse.length).toBeGreaterThan(0)
    expect(bookings.some((b) => b.checkIn === ANCHOR)).toBe(true) // an arrival
    expect(bookings.some((b) => b.checkOut === ANCHOR)).toBe(true) // a departure
  })

  it('marks everything as house data so guest reservations stay separable', () => {
    expect(bookings.every((b) => b.source === 'seed')).toBe(true)
  })
})
