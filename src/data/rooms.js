import gardenSmall from '../assets/room-garden-420.webp'
import gardenLarge from '../assets/room-garden-800.webp'
import panoramaSmall from '../assets/room-panorama-420.webp'
import panoramaLarge from '../assets/room-panorama-800.webp'
import villaSmall from '../assets/room-villa-420.webp'
import villaLarge from '../assets/room-villa-800.webp'

/**
 * The room catalogue.
 *
 * In a real deployment this is a `rooms` table; the shape below is deliberately
 * flat and serialisable so `roomRepository` can start returning rows from a
 * database without a single component changing. `units` is how many physical
 * rooms of this type exist — the availability engine counts overlapping
 * bookings against it, so raising it to 4 immediately allows four concurrent
 * stays with no other code change.
 *
 * `photo` holds the two widths the browser picks between. After bundling these
 * are ordinary URL strings, so a `rooms` table storing image URLs would drop
 * straight in — which is the point. `art` is kept alongside: the gradient is
 * now the placeholder that shows while the photograph loads.
 */
export const ROOMS = [
  {
    id: 'garden-suite',
    name: 'Garden Suite',
    tag: 'Most loved',
    art: 'r1',
    size: '32 m²',
    maxGuests: 2,
    feature: 'Garden terrace',
    rate: 158,
    units: 1,
    description:
      'Ground-floor suite opening onto the pine garden. Rain shower, reading nook, morning sun.',
    heroLabel: 'Garden Suite — terrace',
    photo: {
      small: gardenSmall,
      large: gardenLarge,
      alt: 'A wool blanket on the bed of the Garden Suite, with the window looking out over open hillside',
    },
  },
  {
    id: 'panorama-king',
    name: 'Panorama King',
    tag: 'Mountain view',
    art: 'r2',
    size: '41 m²',
    maxGuests: 2,
    feature: 'Balcony',
    rate: 212,
    units: 1,
    description:
      'Floor-to-ceiling glass facing the ridge. King bed, deep bath, evenings worth staying in for.',
    heroLabel: 'Panorama King — mountain view',
    photo: {
      small: panoramaSmall,
      large: panoramaLarge,
      alt: 'The arched window of the Panorama King, geraniums on the sill and the ridge beyond',
    },
  },
  {
    id: 'royal-villa',
    name: 'Royal Villa',
    tag: 'Signature',
    art: 'r3',
    size: '78 m²',
    maxGuests: 4,
    feature: 'Private pool',
    rate: 440,
    units: 1,
    description:
      'A house of its own — two bedrooms, stone terrace, plunge pool, and total quiet.',
    heroLabel: 'Royal Villa — plunge pool',
    photo: {
      small: villaSmall,
      large: villaLarge,
      alt: 'The Royal Villa terrace at sunset, loungers beside the private plunge pool',
    },
  },
]

export const CURRENCY = '€'

export function findRoom(id) {
  return ROOMS.find((room) => room.id === id) ?? null
}
