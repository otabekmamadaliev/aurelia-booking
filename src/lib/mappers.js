import { ROOMS } from '../data/rooms'

/**
 * Database rows in, domain objects out.
 *
 * Kept apart from `repository.supabase.js` so these can be tested without a
 * project: that module constructs a client at import time, which would make a
 * unit test require credentials to check a rename from `check_in` to
 * `checkIn`.
 *
 * The whole app speaks camelCase and `YYYY-MM-DD` strings; Postgres speaks
 * snake_case and `date`. This is the only place that knows both.
 */

/**
 * Photographs stay as bundled front-end assets keyed by room id: Vite
 * fingerprints them per build, so a URL stored in the database would rot on the
 * next deploy. The `photo_*` columns are the path for when images move to
 * object storage, and are used when there is no bundled asset for that id.
 */
const bundledPhotos = new Map(ROOMS.map((room) => [room.id, room.photo]))

export function toRoom(row) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    art: row.art,
    size: row.size,
    maxGuests: row.max_guests,
    feature: row.feature,
    // Postgres numerics arrive as strings; every price calculation downstream
    // assumes a number, and '158' * 3 is not a mistake anyone catches quickly.
    rate: Number(row.rate),
    units: row.units,
    description: row.description,
    photo: bundledPhotos.get(row.id) ?? {
      small: row.photo_small,
      large: row.photo_large,
      alt: row.photo_alt ?? '',
    },
  }
}

/**
 * A row from either `bookings` or the public `availability` view.
 *
 * The two differ only in what is absent. Guest fields default to empty rather
 * than undefined so the availability engine — which reads `roomId`, `checkIn`
 * and `checkOut` and nothing else — cannot tell the difference, which is
 * exactly why the public view can be so thin.
 */
export function toBooking(row) {
  return {
    id: row.id,
    reference: row.reference ?? null,
    roomId: row.room_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests ?? null,
    guestName: row.guest_name ?? '',
    guestEmail: row.guest_email ?? '',
    notes: row.notes ?? '',
    total: row.total == null ? null : Number(row.total),
    source: row.source ?? 'seed',
    createdAt: row.created_at ?? null,
  }
}
