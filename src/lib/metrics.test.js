import { describe, expect, it } from 'vitest'
import {
  arrivalsOn,
  capacity,
  departuresOn,
  inHouseOn,
  occupancyByNight,
  performance,
  statusOf,
} from './metrics'

const room = (id, units, rate) => ({ id, units, rate, maxGuests: 2, name: id })
const stay = (id, roomId, checkIn, checkOut, total) => ({
  id,
  roomId,
  checkIn,
  checkOut,
  total,
})

// Ten rooms so the arithmetic in these tests stays checkable by hand.
const HOUSE = [room('std', 8, 100), room('suite', 2, 300)]

describe('capacity', () => {
  it('is rooms times nights', () => {
    expect(capacity(HOUSE, '2026-09-12', '2026-09-15')).toBe(30) // 10 rooms x 3
  })

  it('is zero for an empty range', () => {
    expect(capacity(HOUSE, '2026-09-12', '2026-09-12')).toBe(0)
  })
})

describe('performance', () => {
  it('is all zeroes for an empty house', () => {
    const p = performance(HOUSE, [], '2026-09-12', '2026-09-15')
    expect(p).toMatchObject({ roomNightsSold: 0, revenue: 0, occupancy: 0, adr: 0 })
  })

  it('computes occupancy, ADR and RevPAR from the standard definitions', () => {
    // 3 room-nights sold at 100 out of 30 available.
    const bookings = [stay('a', 'std', '2026-09-12', '2026-09-15', 300)]
    const p = performance(HOUSE, bookings, '2026-09-12', '2026-09-15')

    expect(p.roomNightsSold).toBe(3)
    expect(p.revenue).toBe(300)
    expect(p.occupancy).toBeCloseTo(3 / 30)
    expect(p.adr).toBeCloseTo(100) // revenue / nights SOLD
    expect(p.revpar).toBeCloseTo(10) // revenue / nights AVAILABLE
  })

  it('holds the RevPAR = ADR x occupancy identity', () => {
    // The single most useful sanity check on these three numbers: if this ever
    // stops holding, one of the denominators has been mixed up.
    const bookings = [
      stay('a', 'std', '2026-09-12', '2026-09-15', 300),
      stay('b', 'suite', '2026-09-13', '2026-09-14', 300),
      stay('c', 'std', '2026-09-14', '2026-09-15', 100),
    ]
    const p = performance(HOUSE, bookings, '2026-09-12', '2026-09-15')
    expect(p.revpar).toBeCloseTo(p.adr * p.occupancy, 10)
  })

  it('distinguishes ADR from RevPAR when the house is half empty', () => {
    // Selling one expensive suite gives a high ADR and a poor RevPAR. Reporting
    // only ADR would make this look like a good night.
    const bookings = [stay('a', 'suite', '2026-09-12', '2026-09-13', 300)]
    const p = performance(HOUSE, bookings, '2026-09-12', '2026-09-13')
    expect(p.adr).toBeCloseTo(300)
    expect(p.revpar).toBeCloseTo(30)
    expect(p.adr).toBeGreaterThan(p.revpar)
  })

  it('counts only the nights of a stay that fall inside the range', () => {
    // A ten-night stay reported on a single day must contribute one night, not
    // ten, or one long booking would swamp a daily report.
    const bookings = [stay('a', 'std', '2026-09-01', '2026-09-11', 1000)]
    const p = performance(HOUSE, bookings, '2026-09-05', '2026-09-06')
    expect(p.roomNightsSold).toBe(1)
    expect(p.revenue).toBe(100)
  })

  it('ignores a stay that ends before the range opens', () => {
    const bookings = [stay('a', 'std', '2026-09-01', '2026-09-05', 400)]
    const p = performance(HOUSE, bookings, '2026-09-05', '2026-09-08')
    expect(p.roomNightsSold).toBe(0)
  })

  it('falls back to the room rate when a booking has no stored total', () => {
    // Seeded house bookings carry no total; they still have to appear in
    // revenue or the dashboard would under-report occupied rooms' earnings.
    const bookings = [stay('a', 'suite', '2026-09-12', '2026-09-14', undefined)]
    const p = performance(HOUSE, bookings, '2026-09-12', '2026-09-14')
    expect(p.revenue).toBe(600)
  })

  it('uses what was actually charged over the list rate when both exist', () => {
    // A discounted stay must report the discount, not the rack rate.
    const bookings = [stay('a', 'suite', '2026-09-12', '2026-09-14', 400)]
    const p = performance(HOUSE, bookings, '2026-09-12', '2026-09-14')
    expect(p.revenue).toBe(400)
    expect(p.adr).toBeCloseTo(200)
  })
})

describe('occupancyByNight', () => {
  it('reports sold and available per night', () => {
    const bookings = [
      stay('a', 'std', '2026-09-12', '2026-09-14', 200),
      stay('b', 'std', '2026-09-13', '2026-09-14', 100),
    ]
    const nights = occupancyByNight(HOUSE, bookings, '2026-09-12', '2026-09-15')
    expect(nights.map((n) => n.sold)).toEqual([1, 2, 0])
    expect(nights[0].units).toBe(10)
    expect(nights[1].occupancy).toBeCloseTo(0.2)
  })
})

describe('arrivals, departures and in-house', () => {
  const bookings = [
    stay('arriving', 'std', '2026-09-12', '2026-09-15', 300),
    stay('leaving', 'std', '2026-09-09', '2026-09-12', 300),
    stay('staying', 'std', '2026-09-10', '2026-09-14', 400),
  ]

  it('lists arrivals by check-in date', () => {
    expect(arrivalsOn(bookings, '2026-09-12').map((b) => b.id)).toEqual(['arriving'])
  })

  it('lists departures by check-out date', () => {
    expect(departuresOn(bookings, '2026-09-12').map((b) => b.id)).toEqual(['leaving'])
  })

  it('counts arrivals as in-house but not departures', () => {
    // Someone who checked out this morning is not sleeping here tonight.
    const ids = inHouseOn(bookings, '2026-09-12').map((b) => b.id)
    expect(ids).toContain('arriving')
    expect(ids).toContain('staying')
    expect(ids).not.toContain('leaving')
  })
})

describe('statusOf', () => {
  const booking = stay('a', 'std', '2026-09-12', '2026-09-15', 300)

  it('is upcoming before arrival', () => {
    expect(statusOf(booking, '2026-09-11')).toBe('upcoming')
  })

  it('is in-house on the arrival day and mid-stay', () => {
    expect(statusOf(booking, '2026-09-12')).toBe('in-house')
    expect(statusOf(booking, '2026-09-14')).toBe('in-house')
  })

  it('is past on the departure day, since the room is free that night', () => {
    expect(statusOf(booking, '2026-09-15')).toBe('past')
  })
})
