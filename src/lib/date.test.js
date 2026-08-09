import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  fromISO,
  monthGrid,
  nightsBetween,
  nightsInRange,
  startOfMonth,
  toISO,
} from './date'

/**
 * These tests are mostly about one decision: dates travel as `YYYY-MM-DD`
 * strings and never as `Date` objects or timestamps. That is what makes a hotel
 * night mean the same thing in Warsaw and in Tokyo, and most of what follows is
 * guarding the places where a naive implementation would drift.
 */

describe('toISO / fromISO', () => {
  it('round-trips a date without shifting the day', () => {
    expect(toISO(fromISO('2026-09-12'))).toBe('2026-09-12')
  })

  it('pads single-digit months and days', () => {
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('builds a local midnight, not a UTC one', () => {
    // `new Date('2026-09-12')` parses as UTC and lands on the 11th for anyone
    // west of Greenwich. This is the bug the whole string-based design avoids.
    const parsed = fromISO('2026-09-12')
    expect(parsed.getDate()).toBe(12)
    expect(parsed.getMonth()).toBe(8)
    expect(parsed.getHours()).toBe(0)
  })
})

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('goes backwards', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('nightsBetween', () => {
  it('counts the nights, not the days touched', () => {
    expect(nightsBetween('2026-09-12', '2026-09-15')).toBe(3)
  })

  it('is zero for the same day', () => {
    expect(nightsBetween('2026-09-12', '2026-09-12')).toBe(0)
  })

  it('survives a spring-forward DST boundary', () => {
    // In most of Europe the clocks go forward on 29 March 2026, making the raw
    // difference 23 hours per day rather than 24. Without rounding this returns
    // 6.958… and a three-night stay quietly becomes a two-night charge.
    expect(nightsBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('survives an autumn fall-back boundary', () => {
    expect(nightsBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('nightsInRange', () => {
  it('is half-open — the checkout day is not a night', () => {
    expect(nightsInRange('2026-09-12', '2026-09-15')).toEqual([
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
    ])
  })

  it('is empty when arrival and departure are the same day', () => {
    expect(nightsInRange('2026-09-12', '2026-09-12')).toEqual([])
  })

  it('is empty for a backwards range rather than looping forever', () => {
    expect(nightsInRange('2026-09-15', '2026-09-12')).toEqual([])
  })

  it('returns one night for a one-night stay', () => {
    expect(nightsInRange('2026-09-12', '2026-09-13')).toEqual(['2026-09-12'])
  })
})

describe('monthGrid', () => {
  it('always returns six full weeks so the popover never changes height', () => {
    for (const month of ['2026-02-01', '2026-09-01', '2027-01-01']) {
      expect(monthGrid(month)).toHaveLength(42)
    }
  })

  it('starts the week on Monday', () => {
    // 1 September 2026 is a Tuesday, so the grid opens on Monday the 31st.
    const grid = monthGrid('2026-09-14')
    expect(grid[0].iso).toBe('2026-08-31')
    expect(grid[0].inMonth).toBe(false)
    expect(grid[1].iso).toBe('2026-09-01')
    expect(grid[1].inMonth).toBe(true)
  })

  it('marks days outside the month so they can be greyed out', () => {
    const grid = monthGrid('2026-09-01')
    const inMonth = grid.filter((cell) => cell.inMonth)
    expect(inMonth).toHaveLength(30)
    expect(inMonth[0].iso).toBe('2026-09-01')
    expect(inMonth.at(-1).iso).toBe('2026-09-30')
  })

  it('handles a month that begins on a Monday without a blank first week', () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid('2026-06-10')[0].iso).toBe('2026-06-01')
  })
})

describe('startOfMonth / addMonths', () => {
  it('snaps to the first of the month', () => {
    expect(startOfMonth('2026-09-23')).toBe('2026-09-01')
  })

  it('steps months without overflowing on long months', () => {
    // Naively adding a month to 31 January gives 3 March. Snapping to the first
    // beforehand is what keeps the calendar's arrows honest.
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('crosses the year boundary in both directions', () => {
    expect(addMonths('2026-12-05', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-05', -1)).toBe('2025-12-01')
  })
})
