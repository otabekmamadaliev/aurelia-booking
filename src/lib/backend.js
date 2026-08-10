/**
 * Which backend this build is pointed at.
 *
 * Deliberately its own module with no imports at all. Everything that needs to
 * *ask* the question — the repository seam, the admin's auth, the banners —
 * imports this, while only the code that actually talks to Postgres imports the
 * client. Without that separation a single `import { isSupabaseConfigured }`
 * drags the whole Supabase library into the guest bundle, where it would sit
 * unused on every page load of the credential-free demo.
 *
 * Both values are safe in a client bundle: the anon key is designed to be
 * public and grants exactly what row-level security allows it. The key that
 * must never appear in a build is `service_role`, which bypasses RLS entirely.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabaseCredentials = { url, anonKey }
