import { isSupabaseConfigured } from '../lib/backend'

/**
 * Getting into the back office.
 *
 * Two modes, and the difference between them is not cosmetic:
 *
 * - **With Supabase** this is real authentication. Staff sign in, Postgres
 *   issues a JWT, and row-level security decides what that token can read. The
 *   guest list is genuinely unreachable without it — not hidden by the UI, but
 *   refused by the database.
 *
 * - **Without Supabase** it falls back to a passcode compared in the browser,
 *   which protects nothing at all. That mode exists so a fresh clone is
 *   explorable, and the UI says plainly which one is running. A login screen
 *   that looked identical in both cases would be the dishonest version of this.
 *
 * The client is imported dynamically so the demo build never downloads the
 * Supabase library to run a passcode comparison.
 */

const DEMO_KEY = 'aurelia.admin.demo'

export const DEMO_PASSCODE = 'aurelia'
export const usesRealAuth = isSupabaseConfigured

const client = () => import('../lib/supabaseClient').then((module) => module.supabase)

/* ------------------------------------------------------------- demo mode -- */

function isDemoUnlocked() {
  try {
    return sessionStorage.getItem(DEMO_KEY) === 'yes'
  } catch {
    return false
  }
}

function setDemo(unlocked) {
  try {
    if (unlocked) sessionStorage.setItem(DEMO_KEY, 'yes')
    else sessionStorage.removeItem(DEMO_KEY)
  } catch {
    // Private mode — the unlock will not survive a reload.
  }
}

/* ---------------------------------------------------------------- shared -- */

/** Is there a valid session right now? */
export async function currentSession() {
  if (!usesRealAuth) return isDemoUnlocked() ? { demo: true } : null
  const supabase = await client()
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

/**
 * Sign in. Resolves to `{ ok }` or `{ ok: false, message }` rather than
 * throwing, because a wrong password is an expected outcome of this form, not
 * an exceptional one.
 */
export async function signIn({ email, password, passcode }) {
  if (!usesRealAuth) {
    if ((passcode ?? '').trim().toLowerCase() !== DEMO_PASSCODE) {
      return { ok: false, message: 'That passcode is not right.' }
    }
    setDemo(true)
    return { ok: true }
  }

  const supabase = await client()
  const { error } = await supabase.auth.signInWithPassword({
    email: (email ?? '').trim(),
    password: password ?? '',
  })

  if (error) {
    // Deliberately not distinguishing "no such user" from "wrong password":
    // doing so tells an attacker which staff addresses exist.
    return { ok: false, message: 'Those details were not recognised.' }
  }
  return { ok: true }
}

export async function signOut() {
  if (!usesRealAuth) {
    setDemo(false)
    return
  }
  const supabase = await client()
  await supabase.auth.signOut()
}

/** Fires whenever the session changes — a token refresh, or another tab signing out. */
export function onSessionChange(handler) {
  if (!usesRealAuth) return () => {}

  let unsubscribe = () => {}
  let cancelled = false

  client().then((supabase) => {
    if (cancelled) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session))
    unsubscribe = () => data?.subscription?.unsubscribe()
  })

  return () => {
    cancelled = true
    unsubscribe()
  }
}
