import { ROOMS } from './rooms'
import { addDays } from '../lib/date'

/**
 * Demo reservations, generated relative to the day the store is first seeded so
 * the calendar always has something interesting in it no matter when the site
 * is visited.
 *
 * With 19 physical rooms, occupancy has to be built deliberately rather than
 * sprinkled — a handful of bookings against 19 units would leave everything
 * available and the whole availability engine would look like decoration. So
 * the seed creates three distinct situations:
 *
 *   - two stretches where the house is genuinely full, which is what the
 *     calendar strikes out;
 *   - types sold down to their last unit, which is where "last one" comes from;
 *   - types sold out entirely while others stay free, so a search returns a
 *     partial list rather than all-or-nothing.
 *
 * Everything here is written to the same store as real bookings, so a seeded
 * night and a night a guest just booked are indistinguishable to the engine.
 */

/** Nights when every room in the house is taken — a wedding, and a conference. */
const FULL_HOUSE = [
  { from: 6, to: 8, party: 'The Lindqvist wedding' },
  { from: 25, to: 27, party: 'Alpine Forum' },
]

/**
 * Individual stays. `count` is how many units of that type go at once, so
 * `count` equal to the type's `units` sells it out for those nights.
 */
const STAYS = [
  { roomId: 'garden-suite', from: 2, to: 5, count: 3, guest: 'M. Okonkwo' },
  { roomId: 'forest-twin', from: 3, to: 6, count: 4, guest: 'S. Bergström' },
  { roomId: 'panorama-king', from: 2, to: 4, count: 1, guest: 'D. Aoyama' },
  { roomId: 'royal-villa', from: 1, to: 4, count: 1, guest: 'The Ferrante family' },
  { roomId: 'spa-suite', from: 4, to: 7, count: 1, guest: 'C. Almeida' },
  { roomId: 'attic-loft', from: 9, to: 12, count: 2, guest: 'J. Whitfield' },
  { roomId: 'family-chalet', from: 10, to: 14, count: 1, guest: 'The Ivanov party' },
  { roomId: 'garden-suite', from: 12, to: 15, count: 2, guest: 'R. Nowak' },
  { roomId: 'panorama-king', from: 13, to: 16, count: 3, guest: 'H. Takahashi' },
  { roomId: 'forest-twin', from: 14, to: 17, count: 2, guest: 'L. Moreau' },
  { roomId: 'spa-suite', from: 16, to: 19, count: 2, guest: 'A. Kowalczyk' },
  { roomId: 'pine-single', from: 17, to: 20, count: 1, guest: 'T. Bergman' },
  { roomId: 'royal-villa', from: 18, to: 22, count: 1, guest: 'N. Haddad' },
  { roomId: 'attic-loft', from: 20, to: 23, count: 1, guest: 'P. Andersen' },
  { roomId: 'garden-suite', from: 21, to: 24, count: 4, guest: 'The Reyes group' },
  { roomId: 'family-chalet', from: 29, to: 33, count: 1, guest: 'The Nakamura family' },
  { roomId: 'forest-twin', from: 30, to: 33, count: 3, guest: 'K. Solberg' },
  { roomId: 'panorama-king', from: 31, to: 34, count: 2, guest: 'E. Duarte' },
]

export function seedBookings(anchorISO) {
  const bookings = []
  let n = 0

  const push = (roomId, from, to, guestName) => {
    n += 1
    bookings.push({
      id: `seed-${n}`,
      reference: `AUR-S${String(n).padStart(4, '0')}`,
      roomId,
      checkIn: addDays(anchorISO, from),
      checkOut: addDays(anchorISO, to),
      guests: 2,
      guestName,
      guestEmail: '',
      notes: '',
      source: 'seed',
      createdAt: anchorISO,
    })
  }

  // Fill every unit of every type for the full-house stretches.
  for (const block of FULL_HOUSE) {
    for (const room of ROOMS) {
      for (let i = 0; i < room.units; i++) {
        push(room.id, block.from, block.to, block.party)
      }
    }
  }

  for (const stay of STAYS) {
    for (let i = 0; i < stay.count; i++) {
      push(stay.roomId, stay.from, stay.to, stay.guest)
    }
  }

  return bookings
}
