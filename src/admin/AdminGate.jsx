import { useState } from 'react'
import { DEMO_PASSCODE, unlock } from './session'

/**
 * The demo access gate.
 *
 * This is NOT security, and the note below says so where staff can read it.
 * The passcode is compared in the browser, so anyone can read it out of the
 * bundle or step past it in devtools — that is inherent to having no server,
 * not an oversight to be patched later.
 *
 * It earns its place for two honest reasons: it keeps the back office out of
 * the way of someone browsing the guest site, and it marks exactly where real
 * authentication attaches once there is a server to do it. A login screen that
 * quietly implied real protection would be worse than none at all, because
 * somebody might trust it with a real guest list.
 */
export default function AdminGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    if (value.trim().toLowerCase() !== DEMO_PASSCODE) {
      setWrong(true)
      return
    }
    unlock()
    onUnlock()
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Aurelia · Back office</p>
        <h1>Staff sign-in</h1>

        <div className="field">
          <label htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            type="password"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setWrong(false)
            }}
            aria-invalid={wrong}
            aria-describedby={wrong ? 'passcode-error' : undefined}
          />
          {wrong && (
            <p className="err" id="passcode-error">
              That passcode is not right.
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-green" style={{ width: '100%' }}>
          Enter
        </button>

        <p className="gate-note">
          <strong>Demo access, not security.</strong> This check runs in the
          browser, so it protects nothing — it only keeps the back office out of
          the way while you look around. A real deployment authenticates on the
          server. The passcode is <code>{DEMO_PASSCODE}</code>.
        </p>
      </form>
    </div>
  )
}
