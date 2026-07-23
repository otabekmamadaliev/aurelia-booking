import { addDays } from '../lib/date'

/**
 * Demo reservations, generated relative to the day the store is first seeded so
 * the calendar always has something interesting in it no matter when the site
 * is visited. Offsets are chosen so that:
 *
 *   - nights +6 and +7 are taken on *every* room  -> struck out in the calendar
 *   - nights +25 and +26 are taken on every room  -> a second blocked stretch
 *   - the rest only block individual rooms        -> "2 of 3 rooms available"
 *
 * Everything here is written to the same store as real bookings, so a seeded
 * night and a night a guest just booked are indistinguishable to the engine.
 */
const SEED_PLAN = [
  { roomId: 'garden-suite', from: 5, to: 8, guestName: 'H. Lindqvist' },
  { roomId: 'panorama-king', from: 6, to: 9, guestName: 'M. Okonkwo' },
  { roomId: 'royal-villa', from: 4, to: 8, guestName: 'The Ferrante family' },

  { roomId: 'royal-villa', from: 12, to: 15, guestName: 'D. Aoyama' },
  { roomId: 'garden-suite', from: 14, to: 17, guestName: 'S. Bergström' },
  { roomId: 'panorama-king', from: 20, to: 23, guestName: 'C. Almeida' },

  { roomId: 'panorama-king', from: 24, to: 27, guestName: 'J. Whitfield' },
  { roomId: 'garden-suite', from: 25, to: 27, guestName: 'R. Nowak' },
  { roomId: 'royal-villa', from: 25, to: 28, guestName: 'The Ivanov party' },
]

export function seedBookings(anchorISO) {
  return SEED_PLAN.map((entry, index) => ({
    id: `seed-${index + 1}`,
    reference: `AUR-S${String(index + 1).padStart(4, '0')}`,
    roomId: entry.roomId,
    checkIn: addDays(anchorISO, entry.from),
    checkOut: addDays(anchorISO, entry.to),
    guests: 2,
    guestName: entry.guestName,
    guestEmail: '',
    notes: '',
    source: 'seed',
    createdAt: anchorISO,
  }))
}
