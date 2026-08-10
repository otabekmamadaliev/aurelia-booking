import { useState } from 'react'
import { DEMO_PASSCODE, signIn, usesRealAuth } from './auth'

/**
 * Staff sign-in.
 *
 * Renders one of two forms depending on whether the app has a database behind
 * it, and says which. When Supabase is configured this is real authentication
 * and the guest list is unreachable without it. When it is not, the passcode is
 * compared in the browser and protects nothing — showing the same confident
 * login screen in both cases would be the dishonest version of this, because
 * somebody might trust it with a real guest list.
 */
export default function AdminGate({ onUnlock }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const result = await signIn({ email, password, passcode })
    setBusy(false)

    if (!result.ok) {
      setError(result.message)
      return
    }
    onUnlock()
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Aurelia · Back office</p>
        <h1>Staff sign-in</h1>

        {usesRealAuth ? (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                }}
              />
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="passcode">Passcode</label>
            <input
              id="passcode"
              type="password"
              autoComplete="off"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value)
                setError(null)
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'gate-error' : undefined}
            />
          </div>
        )}

        {error && (
          <p className="err" id="gate-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-green"
          style={{ width: '100%' }}
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Enter'}
        </button>

        <p className="gate-note">
          {usesRealAuth ? (
            <>
              <strong>Authenticated against Postgres.</strong> Reservations are
              readable only with a valid staff session — row-level security
              refuses them otherwise, so the guest list is protected by the
              database rather than by this screen.
            </>
          ) : (
            <>
              <strong>Demo access, not security.</strong> No database is
              configured, so this check runs in the browser and protects
              nothing — it only keeps the back office out of the way while you
              look around. The passcode is <code>{DEMO_PASSCODE}</code>.
            </>
          )}
        </p>
      </form>
    </div>
  )
}
