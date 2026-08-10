import { describe, expect, it } from 'vitest'
import { allocate, occupancyGrid, physicalUnits, unitLabel } from './allocation'

const room = (id, name, units) => ({ id, name, units, maxGuests: 2, rate: 100 })
const stay = (id, roomId, checkIn, checkOut) => ({ id, roomId, checkIn, checkOut })

const GARDEN = room('garden', 'Garden Suite', 3)
const VILLA = room('villa', 'Royal Villa', 1)

describe('unitLabel', () => {
  it('numbers rooms only when there is more than one', () => {
    expect(unitLabel(GARDEN, 0)).toBe('Garden Suite 1')
    expect(unitLabel(GARDEN, 2)).toBe('Garden Suite 3')
    expect(unitLabel(VILLA, 0)).toBe('Royal Villa')
  })
})

describe('physicalUnits', () => {
  it('expands each type into its individual rooms', () => {
    const units = physicalUnits([GARDEN, VILLA])
    expect(units).toHaveLength(4)
    expect(units.map((u) => u.label)).toEqual([
      'Garden Suite 1',
      'Garden Suite 2',
      'Garden Suite 3',
      'Royal Villa',
    ])
  })

  it('treats a missing units field as one room', () => {
    expect(physicalUnits([{ id: 'x', name: 'X' }])).toHaveLength(1)
  })
})

describe('allocate', () => {
  it('puts a lone booking in the first room', () => {
    const bookings = [stay('a', 'garden', '2026-09-12', '2026-09-15')]
    const { byBooking } = allocate([GARDEN], bookings)
    expect(byBooking.get('a').index).toBe(0)
  })

  it('moves an overlapping booking to the next room', () => {
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'garden', '2026-09-13', '2026-09-16'),
    ]
    const { byBooking } = allocate([GARDEN], bookings)
    expect(byBooking.get('a').index).toBe(0)
    expect(byBooking.get('b').index).toBe(1)
  })

  it('reuses a room once it is free again', () => {
    // b starts exactly when a ends, so it belongs in the same physical room.
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'garden', '2026-09-15', '2026-09-18'),
    ]
    const { byBooking } = allocate([GARDEN], bookings)
    expect(byBooking.get('b').index).toBe(0)
  })

  it('keeps one stay in a single room for its whole length', () => {
    // The long booking must not be split across rooms even though doing so
    // would technically fit — a guest cannot be moved mid-stay.
    const bookings = [
      stay('short', 'garden', '2026-09-12', '2026-09-13'),
      stay('long', 'garden', '2026-09-12', '2026-09-20'),
    ]
    const { byBooking, byUnit } = allocate([GARDEN], bookings)
    const longUnit = byBooking.get('long')
    expect(longUnit).toBeDefined()
    expect(byUnit.get(longUnit.key).filter((b) => b.id === 'long')).toHaveLength(1)
    expect(longUnit.index).not.toBe(byBooking.get('short').index)
  })

  it('fills every room before reporting anything unplaced', () => {
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'garden', '2026-09-12', '2026-09-15'),
      stay('c', 'garden', '2026-09-12', '2026-09-15'),
    ]
    const { byBooking, unplaced } = allocate([GARDEN], bookings)
    expect(unplaced).toHaveLength(0)
    expect([...byBooking.values()].map((v) => v.index).sort()).toEqual([0, 1, 2])
  })

  it('surfaces an oversold booking rather than dropping it', () => {
    // Four concurrent stays in a three-room type should never happen — the
    // availability engine forbids it. If it ever does, staff must see it.
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'garden', '2026-09-12', '2026-09-15'),
      stay('c', 'garden', '2026-09-12', '2026-09-15'),
      stay('d', 'garden', '2026-09-12', '2026-09-15'),
    ]
    const { unplaced } = allocate([GARDEN], bookings)
    expect(unplaced.map((b) => b.id)).toEqual(['d'])
  })

  it('keeps room types independent', () => {
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'villa', '2026-09-12', '2026-09-15'),
    ]
    const { byBooking } = allocate([GARDEN, VILLA], bookings)
    expect(byBooking.get('a').roomId).toBe('garden')
    expect(byBooking.get('b').roomId).toBe('villa')
    expect(byBooking.get('b').index).toBe(0)
  })

  it('is deterministic regardless of the order it is handed bookings', () => {
    const bookings = [
      stay('a', 'garden', '2026-09-12', '2026-09-15'),
      stay('b', 'garden', '2026-09-13', '2026-09-16'),
      stay('c', 'garden', '2026-09-14', '2026-09-17'),
    ]
    const forward = allocate([GARDEN], bookings).byBooking
    const reversed = allocate([GARDEN], [...bookings].reverse()).byBooking

    for (const id of ['a', 'b', 'c']) {
      expect(reversed.get(id).index).toBe(forward.get(id).index)
    }
  })
})

describe('occupancyGrid', () => {
  it('returns one cell per night per physical room', () => {
    const { nights, grid } = occupancyGrid(
      [GARDEN],
      [stay('a', 'garden', '2026-09-12', '2026-09-14')],
      '2026-09-12',
      '2026-09-15',
    )
    expect(nights).toEqual(['2026-09-12', '2026-09-13', '2026-09-14'])
    expect(grid.size).toBe(3) // three physical Garden Suites
    expect(grid.get('garden#0').map((c) => c.booking?.id ?? null)).toEqual([
      'a',
      'a',
      null,
    ])
    expect(grid.get('garden#1').every((c) => c.booking === null)).toBe(true)
  })

  it('leaves the checkout night empty', () => {
    const { grid } = occupancyGrid(
      [VILLA],
      [stay('a', 'villa', '2026-09-12', '2026-09-13')],
      '2026-09-12',
      '2026-09-14',
    )
    expect(grid.get('villa#0').map((c) => Boolean(c.booking))).toEqual([true, false])
  })
})
