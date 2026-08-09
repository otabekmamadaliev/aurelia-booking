import atticSmall from '../assets/room-attic-420.webp'
import atticLarge from '../assets/room-attic-800.webp'
import familySmall from '../assets/room-family-420.webp'
import familyLarge from '../assets/room-family-800.webp'
import gardenSmall from '../assets/room-garden-420.webp'
import gardenLarge from '../assets/room-garden-800.webp'
import panoramaSmall from '../assets/room-panorama-420.webp'
import panoramaLarge from '../assets/room-panorama-800.webp'
import singleSmall from '../assets/room-single-420.webp'
import singleLarge from '../assets/room-single-800.webp'
import spaSmall from '../assets/room-spa-420.webp'
import spaLarge from '../assets/room-spa-800.webp'
import twinSmall from '../assets/room-twin-420.webp'
import twinLarge from '../assets/room-twin-800.webp'
import villaSmall from '../assets/room-villa-420.webp'
import villaLarge from '../assets/room-villa-800.webp'

/**
 * The room catalogue.
 *
 * In a real deployment this is a `rooms` table; the shape below is deliberately
 * flat and serialisable so `roomRepository` can start returning rows from a
 * database without a single component changing.
 *
 * `units` is how many physical rooms of this type exist, and the availability
 * engine counts overlapping bookings against it. The `units` below sum to 19,
 * which is not decoration — the hero says "Nineteen rooms" and the inventory
 * now actually says so too. It also means most types can be sold several times
 * over for the same night, so "3 left" and "last one" are real states the
 * engine derives rather than copy someone typed.
 *
 * `photo` holds the two widths the browser picks between. After bundling these
 * are ordinary URL strings, so a `rooms` table storing image URLs would drop
 * straight in — which is the point. `art` is kept alongside: the gradient is
 * the placeholder that shows while the photograph loads.
 *
 * Ordered cheapest first, which is also the order the room grid shows them in.
 */
export const ROOMS = [
  {
    id: 'pine-single',
    name: 'Pine Single',
    tag: 'Solo stay',
    art: 'r4',
    size: '18 m²',
    maxGuests: 1,
    feature: 'Reading chair',
    rate: 96,
    units: 2,
    description:
      'A small room done properly. Pine walls, a good mattress, and a window that opens onto the quiet side.',
    photo: {
      small: singleSmall,
      large: singleLarge,
      alt: 'The Pine Single — a bed with a wool throw against warm timber walls',
    },
  },
  {
    id: 'forest-twin',
    name: 'Forest Twin',
    tag: 'Good value',
    art: 'r5',
    size: '26 m²',
    maxGuests: 2,
    feature: 'Twin beds',
    rate: 142,
    units: 4,
    description:
      'Two beds under a dormer window, morning light across the floorboards, pines the whole way to the ridge.',
    photo: {
      small: twinSmall,
      large: twinLarge,
      alt: 'The Forest Twin — two iron-framed beds beneath a sunlit dormer window',
    },
  },
  {
    id: 'garden-suite',
    name: 'Garden Suite',
    tag: 'Most loved',
    art: 'r1',
    size: '32 m²',
    maxGuests: 2,
    feature: 'Garden terrace',
    rate: 158,
    units: 4,
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
    id: 'attic-loft',
    name: 'Attic Loft',
    tag: 'Under the beams',
    art: 'r6',
    size: '38 m²',
    maxGuests: 3,
    feature: 'Wood stove',
    rate: 186,
    units: 2,
    description:
      'The top of the old house — exposed beams, a stove that actually works, and a skylight for the weather.',
    photo: {
      small: atticSmall,
      large: atticLarge,
      alt: 'The Attic Loft — exposed roof beams above a stone fireplace and a low bed',
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
    units: 3,
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
    id: 'spa-suite',
    name: 'Spa Suite',
    tag: 'Spa access',
    art: 'r7',
    size: '46 m²',
    maxGuests: 2,
    feature: 'Private bath',
    rate: 268,
    units: 2,
    description:
      'Deep soaking tub set into the window, robes by the door, and the sauna two floors down.',
    photo: {
      small: spaSmall,
      large: spaLarge,
      alt: 'The Spa Suite — a deep soaking tub set beneath a bright window',
    },
  },
  {
    id: 'family-chalet',
    name: 'Family Chalet',
    tag: 'Sleeps five',
    art: 'r8',
    size: '64 m²',
    maxGuests: 5,
    feature: 'Two bedrooms',
    rate: 330,
    units: 1,
    description:
      'A whole floor for one family. Two bedrooms, a long sofa by the fire, and boots drying by the door.',
    photo: {
      small: familySmall,
      large: familyLarge,
      alt: 'The Family Chalet — a lit fireplace and deep sofas under an A-frame timber roof',
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

/** Total physical rooms in the house — 19, and derived rather than typed. */
export const TOTAL_UNITS = ROOMS.reduce((sum, room) => sum + room.units, 0)

/** The largest party the house can take in a single room. */
export const MAX_PARTY = ROOMS.reduce((max, room) => Math.max(max, room.maxGuests), 1)

export function findRoom(id) {
  return ROOMS.find((room) => room.id === id) ?? null
}
