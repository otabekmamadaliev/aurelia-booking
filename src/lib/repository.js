import { ROOMS } from '../data/rooms'
import { seedBookings } from '../data/seedBookings'
import { isRoomAvailable } from './availability'
import { addDays, today } from './date'

/**
 * The persistence layer, and the only module in the app that knows where data
 * physically lives.
 *
 * Both repositories are async and return plain serialisable objects, so
 * swapping localStorage for a real backend means rewriting this file alone —
 * every caller already awaits, already handles a rejected promise, and already
 * treats writes as something that can fail. `bookingRepository.create` re-reads and
 * re-checks availability at write time rather than trusting what the UI
 * believed a moment ago, which is the same last-line-of-defence check a server
 * would do inside a transaction.
 */

const STORAGE_KEY = 'aurelia.bookings.v1'

/**
 * How long demo data stays fresh. If someone opens the site a month after their
 * last visit the seeded stays would all be in the past and the calendar would
 * look empty, so the seeds are regenerated — real guest bookings are kept.
 */
const SEED_MAX_AGE_DAYS = 14

function canUseStorage() {
  try {
    const probe = '__aurelia_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return true
  } catch {
    // Safari private mode, disabled storage, SSR — fall back to memory.
    return false
  }
}

const hasStorage = typeof window !== 'undefined' && canUseStorage()

/** Used when localStorage is unavailable, so the demo still works end to end. */
let memoryState = null

function readState() {
  if (!hasStorage) return memoryState
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeState(state) {
  memoryState = state
  if (!hasStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota or privacy settings — the in-memory copy keeps the session working.
  }
}

function freshState() {
  const anchor = today()
  return { seededAt: anchor, bookings: seedBookings(anchor) }
}

function loadState() {
  const state = readState()
  if (!state || !Array.isArray(state.bookings)) {
    const created = freshState()
    writeState(created)
    return created
  }

  const stale = !state.seededAt || addDays(state.seededAt, SEED_MAX_AGE_DAYS) < today()
  if (stale) {
    const anchor = today()
    const guestBookings = state.bookings.filter((b) => b.source !== 'seed')
    const refreshed = { seededAt: anchor, bookings: [...seedBookings(anchor), ...guestBookings] }
    writeState(refreshed)
    return refreshed
  }

  return state
}

function makeReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — these get read aloud
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `AUR-${code}`
}

export class UnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnavailableError'
  }
}

export const roomRepository = {
  async list() {
    return ROOMS
  },
}

export const bookingRepository = {
  async list() {
    return loadState().bookings
  },

  /** Only the reservations this visitor made — seeds are house data. */
  async listGuestBookings() {
    return loadState()
      .bookings.filter((booking) => booking.source === 'guest')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /**
   * Write a reservation, or reject it. Availability is verified here against
   * freshly loaded state — two tabs open on the same browser share one store,
   * so the UI's view can genuinely be out of date by the time Confirm is hit.
   */
  async create(draft) {
    const state = loadState()
    const room = ROOMS.find((r) => r.id === draft.roomId)
    if (!room) throw new UnavailableError('That room no longer exists.')

    if (!isRoomAvailable(room, state.bookings, draft.checkIn, draft.checkOut)) {
      throw new UnavailableError(
        `${room.name} was just taken for those dates. Please choose another room or another date.`,
      )
    }
    if (draft.guests > room.maxGuests) {
      throw new UnavailableError(`${room.name} sleeps up to ${room.maxGuests} guests.`)
    }

    const booking = {
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reference: makeReference(),
      roomId: room.id,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      guests: draft.guests,
      guestName: draft.guestName.trim(),
      guestEmail: draft.guestEmail.trim(),
      notes: (draft.notes ?? '').trim(),
      total: draft.total,
      source: 'guest',
      createdAt: new Date().toISOString(),
    }

    writeState({ ...state, bookings: [...state.bookings, booking] })
    return booking
  },

  async cancel(bookingId) {
    const state = loadState()
    writeState({
      ...state,
      bookings: state.bookings.filter(
        (booking) => !(booking.id === bookingId && booking.source === 'guest'),
      ),
    })
    return true
  },

  /** Wipe everything and re-seed — the demo's "start over" button. */
  async reset() {
    const created = freshState()
    writeState(created)
    return created.bookings
  },
}
