import { beforeEach, describe, expect, it } from 'vitest'
import { bookingRepository, roomRepository, UnavailableError } from './repository'
import { unitsLeft } from './availability'
import { addDays, today } from './date'

/**
 * The write path — the last line of defence.
 *
 * Everything the UI shows is advisory: it was computed from a snapshot that may
 * already be stale by the time a guest presses Confirm. `create` is the only
 * place that can actually refuse, so these tests are the ones that back the
 * claim "this cannot double-book".
 *
 * There is no `window` under Node, so the repository falls through to its
 * in-memory store — which is exactly the path a server would take. `reset()`
 * between tests keeps them independent.
 */

const IN = addDays(today(), 60)
const OUT = addDays(today(), 63)

const guest = (over = {}) => ({
  roomId: 'royal-villa',
  checkIn: IN,
  checkOut: OUT,
  guests: 2,
  total: 1320,
  guestName: 'Test Guest',
  guestEmail: 'guest@example.com',
  notes: '',
  ...over,
})

/** Books a room until it will not take another. Returns how many succeeded. */
async function fillUp(roomId, checkIn, checkOut) {
  let placed = 0
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await bookingRepository.create(guest({ roomId, checkIn, checkOut }))
      placed += 1
    } catch (error) {
      if (error instanceof UnavailableError) return placed
      throw error
    }
  }
  throw new Error('room never sold out — units may be unbounded')
}

beforeEach(async () => {
  await bookingRepository.reset()
})

describe('create', () => {
  it('stores a booking and gives it a reference', async () => {
    const booking = await bookingRepository.create(guest())
    expect(booking.reference).toMatch(/^AUR-[A-Z2-9]{5}$/)
    expect(booking.source).toBe('guest')
    expect(booking.roomId).toBe('royal-villa')
  })

  it('never mints a reference containing a lookalike character', async () => {
    // The reference gets read down a phone line, so I, O, 0 and 1 are excluded.
    for (let i = 0; i < 40; i++) {
      const booking = await bookingRepository.create(
        guest({ checkIn: addDays(IN, i * 4), checkOut: addDays(IN, i * 4 + 2) }),
      )
      expect(booking.reference).not.toMatch(/[IO01]/)
    }
  })

  it('trims whitespace off guest details', async () => {
    const booking = await bookingRepository.create(
      guest({ guestName: '  Ada  ', guestEmail: ' ada@example.com ', notes: ' late ' }),
    )
    expect(booking.guestName).toBe('Ada')
    expect(booking.guestEmail).toBe('ada@example.com')
    expect(booking.notes).toBe('late')
  })

  it('refuses to sell the same single-unit room twice', async () => {
    await bookingRepository.create(guest())
    await expect(bookingRepository.create(guest())).rejects.toBeInstanceOf(
      UnavailableError,
    )
  })

  it('refuses a stay that merely overlaps an existing one', async () => {
    await bookingRepository.create(guest())
    // Arrives the night before checkout — one shared night is enough.
    await expect(
      bookingRepository.create(
        guest({ checkIn: addDays(IN, 2), checkOut: addDays(IN, 5) }),
      ),
    ).rejects.toBeInstanceOf(UnavailableError)
  })

  it('allows a back-to-back stay starting on the checkout day', async () => {
    await bookingRepository.create(guest())
    const next = await bookingRepository.create(
      guest({ checkIn: OUT, checkOut: addDays(OUT, 2) }),
    )
    expect(next.checkIn).toBe(OUT)
  })

  it('sells a multi-unit room exactly as many times as it has units', async () => {
    const rooms = await roomRepository.list()
    const garden = rooms.find((r) => r.id === 'garden-suite')
    const free = unitsLeft(garden, await bookingRepository.list(), IN, OUT)

    const placed = await fillUp('garden-suite', IN, OUT)

    expect(placed).toBe(free)
    expect(placed).toBeGreaterThan(1) // otherwise this proves nothing about units
    expect(unitsLeft(garden, await bookingRepository.list(), IN, OUT)).toBe(0)
  })

  it('rejects a party larger than the room sleeps', async () => {
    await expect(
      bookingRepository.create(guest({ roomId: 'pine-single', guests: 3 })),
    ).rejects.toBeInstanceOf(UnavailableError)
  })

  it('rejects an unknown room', async () => {
    await expect(
      bookingRepository.create(guest({ roomId: 'no-such-room' })),
    ).rejects.toBeInstanceOf(UnavailableError)
  })

  it('does not persist anything when it rejects', async () => {
    await bookingRepository.create(guest())
    const before = (await bookingRepository.list()).length
    await expect(bookingRepository.create(guest())).rejects.toThrow()
    expect(await bookingRepository.list()).toHaveLength(before)
  })

  it('re-checks against stored state, not against what it was handed', async () => {
    // The caller passes a total it computed from a stale snapshot. The write
    // still has to consult the store, which is the whole point of the check
    // living here rather than in the component.
    await bookingRepository.create(guest())
    await expect(bookingRepository.create(guest({ total: 1 }))).rejects.toBeInstanceOf(
      UnavailableError,
    )
  })
})

describe('cancel', () => {
  it('frees the room again', async () => {
    const booking = await bookingRepository.create(guest())
    await bookingRepository.cancel(booking.id)

    const next = await bookingRepository.create(guest())
    expect(next.id).not.toBe(booking.id)
  })

  it('refuses to cancel a house booking', async () => {
    const seeded = (await bookingRepository.list()).find((b) => b.source === 'seed')
    await bookingRepository.cancel(seeded.id)
    const stillThere = (await bookingRepository.list()).some((b) => b.id === seeded.id)
    expect(stillThere).toBe(true)
  })
})

describe('listGuestBookings', () => {
  it('returns only this visitor’s reservations, newest first', async () => {
    const first = await bookingRepository.create(guest())
    await new Promise((r) => setTimeout(r, 5)) // distinct createdAt
    const second = await bookingRepository.create(
      guest({ checkIn: addDays(IN, 10), checkOut: addDays(IN, 12) }),
    )

    const mine = await bookingRepository.listGuestBookings()
    expect(mine.map((b) => b.id)).toEqual([second.id, first.id])
    expect(mine.every((b) => b.source === 'guest')).toBe(true)
  })
})

describe('search', () => {
  it('returns the current bookings after its round-trip', async () => {
    const created = await bookingRepository.create(guest())
    const found = await bookingRepository.search()
    expect(found.some((b) => b.id === created.id)).toBe(true)
  })
})

describe('reset', () => {
  it('drops guest bookings and restores the seeded house', async () => {
    await bookingRepository.create(guest())
    const after = await bookingRepository.reset()
    expect(after.every((b) => b.source === 'seed')).toBe(true)
    expect(after.length).toBeGreaterThan(0)
  })
})
