import { describe, expect, it } from 'vitest'
import {
  availableRooms,
  cheapestOption,
  conflictsFor,
  fullyBookedNights,
  isRoomAvailable,
  isValidRange,
  priceFor,
  rangeCrossesBlockedNight,
  rangesOverlap,
  unavailableRooms,
  unitsLeft,
} from './availability'

/**
 * The engine's whole job is to never sell the same room twice while never
 * refusing a stay it could have taken. Those two failures pull in opposite
 * directions, so most of what follows pins down the exact boundary between
 * them: the half-open night range.
 */

const room = (id, units, maxGuests = 2, rate = 100) => ({
  id,
  units,
  maxGuests,
  rate,
})

const stay = (roomId, checkIn, checkOut) => ({ roomId, checkIn, checkOut })

/** One of everything, so a test can name a room without building a fixture. */
const SINGLE = room('single', 1)
const TRIPLE = room('triple', 3)

describe('rangesOverlap', () => {
  it('is false when one stay ends exactly as the other begins', () => {
    // This is the case the entire design hinges on: someone checks out on the
    // 15th and someone else checks in on the 15th. Using >= here instead of >
    // would refuse perfectly sellable back-to-back bookings.
    expect(rangesOverlap('2026-09-12', '2026-09-15', '2026-09-15', '2026-09-18')).toBe(
      false,
    )
    expect(rangesOverlap('2026-09-15', '2026-09-18', '2026-09-12', '2026-09-15')).toBe(
      false,
    )
  })

  it('is true when the ranges share even a single night', () => {
    expect(rangesOverlap('2026-09-12', '2026-09-15', '2026-09-14', '2026-09-18')).toBe(
      true,
    )
  })

  it('is true when one range is entirely inside the other', () => {
    expect(rangesOverlap('2026-09-10', '2026-09-20', '2026-09-13', '2026-09-15')).toBe(
      true,
    )
    expect(rangesOverlap('2026-09-13', '2026-09-15', '2026-09-10', '2026-09-20')).toBe(
      true,
    )
  })

  it('is true for identical ranges', () => {
    expect(rangesOverlap('2026-09-12', '2026-09-15', '2026-09-12', '2026-09-15')).toBe(
      true,
    )
  })
})

describe('isValidRange', () => {
  it('rejects empty, backwards and zero-length ranges', () => {
    expect(isValidRange('', '2026-09-15')).toBe(false)
    expect(isValidRange('2026-09-15', '')).toBe(false)
    expect(isValidRange('2026-09-15', '2026-09-12')).toBe(false)
    expect(isValidRange('2026-09-12', '2026-09-12')).toBe(false)
  })

  it('accepts a one-night stay', () => {
    expect(isValidRange('2026-09-12', '2026-09-13')).toBe(true)
  })
})

describe('unitsLeft', () => {
  it('reports the full inventory when nothing is booked', () => {
    expect(unitsLeft(TRIPLE, [], '2026-09-12', '2026-09-15')).toBe(3)
  })

  it('decrements per overlapping booking rather than selling the type out', () => {
    const bookings = [stay('triple', '2026-09-12', '2026-09-15')]
    expect(unitsLeft(TRIPLE, bookings, '2026-09-12', '2026-09-15')).toBe(2)
  })

  it('reaches zero only when every unit is taken', () => {
    const bookings = [
      stay('triple', '2026-09-12', '2026-09-15'),
      stay('triple', '2026-09-12', '2026-09-15'),
      stay('triple', '2026-09-12', '2026-09-15'),
    ]
    expect(unitsLeft(TRIPLE, bookings, '2026-09-12', '2026-09-15')).toBe(0)
  })

  it('never goes negative even if the store is oversold', () => {
    const bookings = Array.from({ length: 5 }, () =>
      stay('single', '2026-09-12', '2026-09-15'),
    )
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(0)
  })

  it('answers with the worst night, not the average', () => {
    // Free on two of the three nights, sold out on the middle one. A stay needs
    // the same physical room throughout, so the honest answer is zero — an
    // averaging implementation would happily sell this and double-book.
    const bookings = [stay('single', '2026-09-13', '2026-09-14')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(0)
  })

  it('counts a booking that overlaps only the tail of the range', () => {
    const bookings = [stay('single', '2026-09-14', '2026-09-20')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(0)
  })

  it('counts a booking that overlaps only the head of the range', () => {
    const bookings = [stay('single', '2026-09-08', '2026-09-13')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(0)
  })

  it('ignores a booking that ends on the arrival day', () => {
    const bookings = [stay('single', '2026-09-08', '2026-09-12')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(1)
  })

  it('ignores a booking that starts on the departure day', () => {
    const bookings = [stay('single', '2026-09-15', '2026-09-18')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(1)
  })

  it('ignores bookings for other rooms', () => {
    const bookings = [stay('other-room', '2026-09-12', '2026-09-15')]
    expect(unitsLeft(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(1)
  })

  it('treats a missing units field as a single room', () => {
    expect(unitsLeft({ id: 'x', maxGuests: 2 }, [], '2026-09-12', '2026-09-15')).toBe(1)
  })

  it('is zero for an invalid range instead of throwing', () => {
    expect(unitsLeft(SINGLE, [], '2026-09-15', '2026-09-12')).toBe(0)
  })
})

describe('isRoomAvailable', () => {
  it('follows unitsLeft', () => {
    const bookings = [stay('single', '2026-09-12', '2026-09-15')]
    expect(isRoomAvailable(SINGLE, bookings, '2026-09-12', '2026-09-15')).toBe(false)
    expect(isRoomAvailable(SINGLE, bookings, '2026-09-15', '2026-09-18')).toBe(true)
  })
})

describe('conflictsFor', () => {
  it('returns only the colliding stays for that room', () => {
    const bookings = [
      stay('single', '2026-09-13', '2026-09-14'), // collides
      stay('single', '2026-09-15', '2026-09-18'), // starts on departure day
      stay('other', '2026-09-13', '2026-09-14'), // different room
    ]
    const found = conflictsFor(bookings, 'single', '2026-09-12', '2026-09-15')
    expect(found).toHaveLength(1)
    expect(found[0].checkIn).toBe('2026-09-13')
  })
})

describe('availableRooms / unavailableRooms', () => {
  const rooms = [
    room('small', 2, 2, 100),
    room('large', 1, 5, 300),
    room('busy', 1, 4, 200),
  ]
  const bookings = [stay('busy', '2026-09-12', '2026-09-15')]

  it('excludes rooms too small for the party', () => {
    const found = availableRooms(rooms, bookings, '2026-09-12', '2026-09-15', 5)
    expect(found.map((r) => r.id)).toEqual(['large'])
  })

  it('excludes rooms with no units left', () => {
    const found = availableRooms(rooms, bookings, '2026-09-12', '2026-09-15', 2)
    expect(found.map((r) => r.id)).toEqual(['small', 'large'])
  })

  it('splits cleanly — a room is in exactly one of the two lists', () => {
    const free = availableRooms(rooms, bookings, '2026-09-12', '2026-09-15', 2)
    const taken = unavailableRooms(rooms, bookings, '2026-09-12', '2026-09-15', 2)
    const fits = rooms.filter((r) => r.maxGuests >= 2)
    expect(free.length + taken.length).toBe(fits.length)
    expect(free.filter((r) => taken.includes(r))).toHaveLength(0)
  })

  it('returns nothing for an invalid range', () => {
    expect(availableRooms(rooms, bookings, '2026-09-15', '2026-09-12', 2)).toEqual([])
  })
})

describe('fullyBookedNights', () => {
  const rooms = [room('a', 1, 2), room('b', 2, 2)]

  it('is empty when anything is free', () => {
    const blocked = fullyBookedNights(rooms, [], 2, '2026-09-12', '2026-09-15')
    expect(blocked.size).toBe(0)
  })

  it('marks only the nights where every suitable room is full', () => {
    const bookings = [
      stay('a', '2026-09-13', '2026-09-14'),
      stay('b', '2026-09-13', '2026-09-14'),
      stay('b', '2026-09-13', '2026-09-14'),
    ]
    const blocked = fullyBookedNights(rooms, bookings, 2, '2026-09-12', '2026-09-16')
    expect([...blocked]).toEqual(['2026-09-13'])
  })

  it('does not block a night while one unit of one type survives', () => {
    const bookings = [
      stay('a', '2026-09-13', '2026-09-14'),
      stay('b', '2026-09-13', '2026-09-14'),
    ]
    const blocked = fullyBookedNights(rooms, bookings, 2, '2026-09-12', '2026-09-16')
    expect(blocked.size).toBe(0)
  })

  it('blocks more nights for a larger party, since fewer rooms qualify', () => {
    // Only the suite sleeps four, so one booking closes the night for a family
    // while a couple can still be sold the smaller rooms.
    const withSuite = [room('twin', 4, 2), room('suite', 1, 4)]
    const bookings = [stay('suite', '2026-09-13', '2026-09-14')]
    expect(
      fullyBookedNights(withSuite, bookings, 2, '2026-09-12', '2026-09-16').size,
    ).toBe(0)
    expect([
      ...fullyBookedNights(withSuite, bookings, 4, '2026-09-12', '2026-09-16'),
    ]).toEqual(['2026-09-13'])
  })

  it('blocks nothing when no room can hold the party at all', () => {
    const blocked = fullyBookedNights(rooms, [], 9, '2026-09-12', '2026-09-15')
    expect(blocked.size).toBe(0)
  })
})

describe('rangeCrossesBlockedNight', () => {
  const blocked = new Set(['2026-09-14'])

  it('catches a stay that spans the blocked night', () => {
    expect(rangeCrossesBlockedNight('2026-09-12', '2026-09-16', blocked)).toBe(true)
  })

  it('allows a stay that checks out on the blocked day', () => {
    // Departing on the morning of a sold-out night does not occupy it.
    expect(rangeCrossesBlockedNight('2026-09-12', '2026-09-14', blocked)).toBe(false)
  })

  it('catches a stay that arrives on the blocked day', () => {
    expect(rangeCrossesBlockedNight('2026-09-14', '2026-09-16', blocked)).toBe(true)
  })
})

describe('priceFor', () => {
  it('multiplies nights by the nightly rate', () => {
    expect(priceFor(room('r', 1, 2, 158), '2026-09-12', '2026-09-15')).toEqual({
      nights: 3,
      rate: 158,
      total: 474,
    })
  })

  it('is zero for an invalid range rather than negative', () => {
    expect(priceFor(room('r', 1, 2, 158), '2026-09-15', '2026-09-12')).toEqual({
      nights: 0,
      rate: 158,
      total: 0,
    })
  })

  it('does not throw when the room is missing', () => {
    expect(priceFor(null, '2026-09-12', '2026-09-15')).toEqual({
      nights: 0,
      rate: 0,
      total: 0,
    })
  })
})

describe('cheapestOption', () => {
  const rooms = [
    room('mid', 1, 2, 200),
    room('cheap', 1, 2, 100),
    room('big', 1, 5, 300),
  ]

  it('picks the lowest nightly rate among bookable rooms', () => {
    const best = cheapestOption(rooms, [], '2026-09-12', '2026-09-15', 2)
    expect(best.room.id).toBe('cheap')
    expect(best.total).toBe(300)
  })

  it('ignores cheaper rooms that cannot hold the party', () => {
    // A family of five cannot have `cheap` at any price, so the quoted "from"
    // figure has to climb to the only room that fits them.
    const best = cheapestOption(rooms, [], '2026-09-12', '2026-09-15', 5)
    expect(best.room.id).toBe('big')
    expect(best.total).toBe(900)
  })

  it('skips rooms that are sold out', () => {
    const bookings = [stay('cheap', '2026-09-12', '2026-09-15')]
    const best = cheapestOption(rooms, bookings, '2026-09-12', '2026-09-15', 2)
    expect(best.room.id).toBe('mid')
  })

  it('is null when nothing is bookable', () => {
    expect(cheapestOption(rooms, [], '2026-09-12', '2026-09-15', 99)).toBeNull()
  })
})
