import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import AdminGate from './AdminGate'
import { isUnlocked } from './session'
import Dashboard from './Dashboard'
import Reservations from './Reservations'
import TapeChart from './TapeChart'
import { useAdminData } from './useAdminData'
import { TOTAL_UNITS } from '../data/rooms'
import './admin.css'

export default function AdminApp() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  const { rooms, bookings, loading, error, cancel } = useAdminData()
  const [highlighted, setHighlighted] = useState(null)

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />

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

        <Link className="admin-exit" to="/">
          View public site ↗
        </Link>
      </header>

      <p className="admin-warning">
        <strong>Demo back office.</strong> Access is gated in the browser, not on a
        server, and every reservation lives in this browser alone — nothing here
        is shared between devices or protected. {TOTAL_UNITS} rooms of sample
        inventory.
      </p>

      {error && <p className="notice">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading reservations…</p>
      ) : (
        <Routes>
          <Route index element={<Dashboard rooms={rooms} bookings={bookings} />} />
          <Route
            path="chart"
            element={
              <TapeChart rooms={rooms} bookings={bookings} onSelect={setHighlighted} />
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
            onClick={() => setHighlighted(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <p className="ref">{highlighted.reference}</p>
          <h3>{highlighted.guestName || 'Reserved'}</h3>
          <p className="peek-line">
            {highlighted.checkIn} → {highlighted.checkOut}
          </p>
          {highlighted.guestEmail && (
            <p className="peek-line">{highlighted.guestEmail}</p>
          )}
          {highlighted.notes && <p className="peek-note">“{highlighted.notes}”</p>}
        </div>
      )}
    </div>
  )
}
