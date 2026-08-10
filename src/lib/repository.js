import { isSupabaseConfigured } from './backend'
import * as local from './repository.local'

/**
 * The storage seam.
 *
 * Every caller in the app imports `roomRepository` and `bookingRepository` from
 * here and has done since the first commit, when both were backed by
 * `localStorage`. Adding Postgres did not change a single one of them: they
 * already awaited, already handled a rejected write, and already treated
 * "unavailable" as an error rather than a return value. That is what the seam
 * was for.
 *
 * Which backend runs is decided by whether the build was given a Supabase URL
 * and anon key. With them, data is shared across every device and the
 * no-double-booking guarantee is enforced by a Postgres transaction. Without
 * them the app falls back to the in-browser store, so a fresh clone runs the
 * entire demo with no credentials and no network.
 *
 * The Postgres backend is loaded with a dynamic import rather than a static
 * one, which keeps the Supabase client out of the main bundle entirely when no
 * project is configured — roughly 26 kB gzipped that a visitor to the
 * standalone demo would otherwise download and never execute.
 */
const backend = isSupabaseConfigured ? await import('./repository.supabase') : local

export const roomRepository = backend.roomRepository
export const bookingRepository = backend.bookingRepository

/** True when reservations are shared rather than confined to this browser. */
export const isShared = isSupabaseConfigured

export { UnavailableError } from './errors'
