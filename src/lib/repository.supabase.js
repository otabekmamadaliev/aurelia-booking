import { UnavailableError } from './errors'
import { toBooking, toRoom } from './mappers'
import { supabase } from './supabaseClient'

/**
 * The Postgres backend.
 *
 * Two things shape this file, both of them consequences of the schema rather
 * than choices made here:
 *
 * 1. **Guests never read the bookings table.** It holds names, e-mail addresses
 *    and notes, and a booking site has no business handing that to every
 *    visitor. Anonymous clients read `availability` instead — the same rows
 *    with the people stripped out — which is all the engine needs. Staff sign
 *    in and read the real table.
 *
 * 2. **Guests never write to it either.** Reservations go through the
 *    `create_booking` function, which re-checks capacity under an advisory lock
 *    inside the same transaction as the insert. That is the part that makes
 *    "cannot double-book" true across devices rather than merely within one.
 */

/**
 * Turn a Postgres error into something a guest can read.
 *
 * `create_booking` raises with specific SQLSTATEs so the two refusals worth
 * distinguishing — "someone just took it" and "that will not fit" — arrive here
 * already separated, rather than as one opaque failure.
 */
function asDomainError(error) {
  if (!error) return null
  const code = error.code ?? ''
  const message = error.message ?? 'Something went wrong.'

  // 23505 unique_violation, 23514 check_violation, P0002 no_data_found — the
  // codes the function raises deliberately.
  if (['23505', '23514', 'P0002'].includes(code) || /fully booked|sleeps up to/i.test(message)) {
    // Postgres prefixes raised messages; keep only the sentence meant for the guest.
    return new UnavailableError(message.replace(/^.*?:\s*/, '').trim() || message)
  }
  return new Error(message)
}

/* ------------------------------------------------- guest-side bookkeeping -- */

/**
 * References this browser created.
 *
 * "My reservations" cannot be a query — an anonymous visitor is not allowed to
 * read the bookings table, and that is the correct answer for a guest list. So
 * the browser remembers what it booked. Losing this only loses the convenience
 * list; the reservation itself lives in Postgres and the guest has the
 * reference in their confirmation e-mail.
 */
const MINE_KEY = 'aurelia.mybookings.v1'

function readMine() {
  try {
    const raw = window.localStorage.getItem(MINE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeMine(list) {
  try {
    window.localStorage.setItem(MINE_KEY, JSON.stringify(list))
  } catch {
    // Private mode. The reservation still exists; only the local list is lost.
  }
}

/* ---------------------------------------------------------- repositories -- */

export const roomRepository = {
  async list() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw asDomainError(error)
    return data.map(toRoom)
  },
}

export const bookingRepository = {
  /**
   * Occupancy for the availability engine.
   *
   * Reads the PII-free view when nobody is signed in and the full table when
   * staff are, so the back office gets guest names without a second code path.
   */
  async list() {
    const { data: sessionData } = await supabase.auth.getSession()
    const signedIn = Boolean(sessionData?.session)

    const { data, error } = signedIn
      ? await supabase.from('bookings').select('*')
      : await supabase.from('availability').select('*')

    if (error) throw asDomainError(error)
    return data.map(toBooking)
  },

  /** Same query — the round-trip *is* the search. */
  async search() {
    return this.list()
  },

  async listGuestBookings() {
    return readMine().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  },

  async create(draft) {
    const { data, error } = await supabase.rpc('create_booking', {
      p_room_id: draft.roomId,
      p_check_in: draft.checkIn,
      p_check_out: draft.checkOut,
      p_guests: draft.guests,
      p_guest_name: draft.guestName ?? '',
      p_guest_email: draft.guestEmail ?? null,
      p_notes: draft.notes ?? null,
      p_source: draft.source === 'staff' ? 'staff' : 'guest',
    })

    if (error) throw asDomainError(error)

    // Postgres returns the composite row; supabase-js hands it back as an
    // object, or as a single-element array depending on the driver version.
    const booking = toBooking(Array.isArray(data) ? data[0] : data)

    if (booking.source === 'guest') {
      writeMine([...readMine(), booking])
    }
    return booking
  },

  /** Guest cancellation — the reference is the proof of ownership. */
  async cancel(bookingId) {
    const mine = readMine()
    const booking = mine.find((entry) => entry.id === bookingId)
    if (!booking) return false

    const { data, error } = await supabase.rpc('cancel_booking', {
      p_id: bookingId,
      p_reference: booking.reference,
    })
    if (error) throw asDomainError(error)

    writeMine(mine.filter((entry) => entry.id !== bookingId))
    return Boolean(data)
  },

  /** Staff cancellation — allowed to remove anything, and RLS enforces it. */
  async cancelAsStaff(bookingId) {
    const { error, count } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })
      .eq('id', bookingId)

    if (error) throw asDomainError(error)
    writeMine(readMine().filter((entry) => entry.id !== bookingId))
    return (count ?? 0) > 0
  },

  /**
   * Not available against a shared database.
   *
   * Re-seeding is a destructive operation on data other people can see, so it
   * belongs in a migration run deliberately, not behind a button any visitor
   * can press.
   */
  async reset() {
    throw new Error(
      'Resetting sample data is only available on the in-browser demo. Re-run supabase/seed.sql against the project instead.',
    )
  },
}
