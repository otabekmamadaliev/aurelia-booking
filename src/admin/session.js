/**
 * Whether the demo gate has been passed in this tab.
 *
 * Kept out of the component file so that module exports only components and
 * Fast Refresh keeps working — the same reason `bookingContext` lives apart
 * from `BookingProvider`.
 *
 * `sessionStorage`, not `localStorage`: the unlock should die with the tab.
 * This is a demo gate, and a "login" that silently persisted for weeks would
 * overstate what it is.
 */
const SESSION_KEY = 'aurelia.admin.demo'

export const DEMO_PASSCODE = 'aurelia'

export function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'yes'
  } catch {
    return false
  }
}

export function unlock() {
  try {
    sessionStorage.setItem(SESSION_KEY, 'yes')
  } catch {
    // Private mode — the unlock simply will not survive a reload.
  }
}
