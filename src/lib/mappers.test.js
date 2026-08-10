import { describe, expect, it } from 'vitest'
import { toBooking, toRoom } from './mappers'
import { ROOMS } from '../data/rooms'

/**
 * The boundary between Postgres and the rest of the app.
 *
 * Two things here are easy to get wrong and expensive when wrong: numerics
 * arrive as strings, and rows from the public `availability` view are missing
 * every guest field. Both are silent failures — `'158' * 3` is `474` right up
 * until it is `'158158158'`, and an undefined `guestName` renders as nothing
 * rather than throwing.
 */

describe('toRoom', () => {
  const row = {
    id: 'garden-suite',
    name: 'Garden Suite',
    tag: 'Most loved',
    art: 'r1',
    size: '32 m²',
    max_guests: 2,
    feature: 'Garden terrace',
    rate: '158.00',
    units: 4,
    description: 'Ground-floor suite.',
    sort_order: 3,
  }

  it('renames snake_case columns to the shape the app speaks', () => {
    const room = toRoom(row)
    expect(room).toMatchObject({
      id: 'garden-suite',
      maxGuests: 2,
      units: 4,
      feature: 'Garden terrace',
    })
  })

  it('converts a numeric rate to a number', () => {
    // Postgres numerics arrive as strings. Left alone, `rate * nights` becomes
    // string repetition and a three-night stay quietly costs €158158158.
    const room = toRoom(row)
    expect(room.rate).toBe(158)
    expect(typeof room.rate).toBe('number')
    expect(room.rate * 3).toBe(474)
  })

  it('prefers the bundled photograph over a stored URL', () => {
    // Vite fingerprints assets per build, so a URL in the database would rot on
    // the next deploy.
    const room = toRoom({ ...row, photo_small: '/stale.jpg', photo_large: '/stale.jpg' })
    const bundled = ROOMS.find((r) => r.id === 'garden-suite').photo
    expect(room.photo).toBe(bundled)
  })

  it('falls back to stored URLs for a room the front end has no asset for', () => {
    const room = toRoom({
      ...row,
      id: 'newly-added-room',
      photo_small: '/uploads/small.jpg',
      photo_large: '/uploads/large.jpg',
      photo_alt: 'A new room',
    })
    expect(room.photo).toEqual({
      small: '/uploads/small.jpg',
      large: '/uploads/large.jpg',
      alt: 'A new room',
    })
  })
})

describe('toBooking', () => {
  const full = {
    id: '0f8b...',
    reference: 'AUR-K7M2Q',
    room_id: 'garden-suite',
    check_in: '2026-09-12',
    check_out: '2026-09-15',
    guests: 2,
    guest_name: 'Ada Lovelace',
    guest_email: 'ada@example.com',
    notes: 'Late arrival',
    total: '474.00',
    source: 'guest',
    created_at: '2026-08-10T09:00:00Z',
  }

  it('maps a full row from the bookings table', () => {
    expect(toBooking(full)).toEqual({
      id: '0f8b...',
      reference: 'AUR-K7M2Q',
      roomId: 'garden-suite',
      checkIn: '2026-09-12',
      checkOut: '2026-09-15',
      guests: 2,
      guestName: 'Ada Lovelace',
      guestEmail: 'ada@example.com',
      notes: 'Late arrival',
      total: 474,
      source: 'guest',
      createdAt: '2026-08-10T09:00:00Z',
    })
  })

  it('keeps dates as plain strings rather than parsing them', () => {
    // A hotel night is a calendar concept. Turning it into a Date here would
    // reintroduce every timezone bug the string format exists to avoid.
    const booking = toBooking(full)
    expect(booking.checkIn).toBe('2026-09-12')
    expect(typeof booking.checkIn).toBe('string')
  })

  it('handles a row from the public availability view, which has no guest', () => {
    // This is what an anonymous visitor receives: occupancy without people.
    const view = {
      id: '0f8b...',
      room_id: 'garden-suite',
      check_in: '2026-09-12',
      check_out: '2026-09-15',
    }
    const booking = toBooking(view)

    expect(booking.roomId).toBe('garden-suite')
    expect(booking.checkIn).toBe('2026-09-12')
    expect(booking.checkOut).toBe('2026-09-15')
    // Absent, not undefined — the availability engine and the room cards read
    // these without guarding.
    expect(booking.guestName).toBe('')
    expect(booking.guestEmail).toBe('')
    expect(booking.reference).toBeNull()
    expect(booking.total).toBeNull()
  })

  it('produces something the availability engine can consume unchanged', () => {
    const view = {
      id: 'x',
      room_id: 'garden-suite',
      check_in: '2026-09-12',
      check_out: '2026-09-15',
    }
    const booking = toBooking(view)
    // The exact three fields every availability function reads.
    expect(booking.roomId).toBeTruthy()
    expect(booking.checkIn < booking.checkOut).toBe(true)
  })

  it('converts a numeric total and tolerates a missing one', () => {
    expect(toBooking(full).total).toBe(474)
    expect(toBooking({ ...full, total: null }).total).toBeNull()
  })
})
