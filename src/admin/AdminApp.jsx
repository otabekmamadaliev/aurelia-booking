import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import AdminGate from './AdminGate'
import Dashboard from './Dashboard'
import Reservations from './Reservations'
import TapeChart from './TapeChart'
import { currentSession, onSessionChange, signOut, usesRealAuth } from './auth'
import { useAdminData } from './useAdminData'
import { TOTAL_UNITS } from '../data/rooms'
import { isShared } from '../lib/repository'
import './admin.css'

export default function AdminApp() {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [highlighted, setHighlighted] = useState(null)

  useEffect(() => {
    let cancelled = false
    currentSession().then((found) => {
      if (!cancelled) setSession(found)
    })
    // A token refresh, or another tab signing out, has to be reflected here —
    // otherwise the back office keeps rendering a guest list it can no longer
    // fetch.
    const unsubscribe = onSessionChange((next) => setSession(next))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOut()
    setSession(null)
  }, [])

  if (session === undefined) return <p className="admin-loading">Checking session…</p>
  if (!session) return <AdminGate onUnlock={() => currentSession().then(setSession)} />

  return <AdminShell onSignOut={handleSignOut} highlighted={highlighted} onHighlight={setHighlighted} />
}

function AdminShell({ onSignOut, highlighted, onHighlight }) {
  const { rooms, bookings, loading, error, cancel } = useAdminData()

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-brand">
          <span className="logo">
            AURE<em>L</em>IA
          </span>
          <span className="admin-tag">Back office</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/chart">Room chart</NavLink>
          <NavLink to="/admin/reservations">Reservations</NavLink>
        </nav>

        <div className="admin-meta">
          <Link className="admin-exit" to="/">
            Public site ↗
          </Link>
          <button type="button" className="admin-exit as-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {isShared ? (
        <p className="admin-banner shared">
          <strong>Connected to Postgres.</strong> Reservations are shared across
          every device, availability is enforced inside a database transaction,
          and this page is readable only with a staff session. {TOTAL_UNITS}{' '}
          rooms.
        </p>
      ) : (
        <p className="admin-banner local">
          <strong>Demo back office.</strong> No database is configured, so every
          reservation lives in this browser alone — nothing here is shared
          between devices, and the sign-in protects nothing. {TOTAL_UNITS} rooms
          of sample inventory.
        </p>
      )}

      {error && <p className="notice">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading reservations…</p>
      ) : (
        <Routes>
          <Route index element={<Dashboard rooms={rooms} bookings={bookings} />} />
          <Route
            path="chart"
            element={
              <TapeChart rooms={rooms} bookings={bookings} onSelect={onHighlight} />
            }
          />
          <Route
            path="reservations"
            element={
              <Reservations rooms={rooms} bookings={bookings} onCancel={cancel} />
            }
          />
        </Routes>
      )}

      {highlighted && (
        <div className="peek" role="dialog" aria-label="Reservation details">
          <button
            type="button"
            className="peek-close"
            onClick={() => onHighlight(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <p className="ref">{highlighted.reference}</p>
          <h3>{highlighted.guestName || 'Reserved'}</h3>
          <p className="peek-line">
            {highlighted.checkIn} → {highlighted.checkOut}
          </p>
          {highlighted.guestEmail && <p className="peek-line">{highlighted.guestEmail}</p>}
          {highlighted.notes && <p className="peek-note">“{highlighted.notes}”</p>}
        </div>
      )}

      {!usesRealAuth && (
        <p className="admin-footnote">
          Point <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> at a project to switch this to real
          authentication and shared data.
        </p>
      )}
    </div>
  )
}
