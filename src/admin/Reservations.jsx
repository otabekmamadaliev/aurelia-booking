import { useMemo, useState } from 'react'
import { CURRENCY } from '../data/rooms'
import { formatShort, nightsBetween, today } from '../lib/date'
import { statusOf } from '../lib/metrics'
import { allocate } from '../lib/allocation'

const FILTERS = {
  all: 'All',
  'in-house': 'In house',
  upcoming: 'Upcoming',
  past: 'Past',
}

/**
 * The reservation list.
 *
 * Search covers name, reference and email together rather than offering a field
 * chooser, because the desk does not know in advance which of the three the
 * caller will read out.
 */
export default function Reservations({ rooms, bookings, onCancel }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirming, setConfirming] = useState(null)

  const now = today()
  const roomName = (id) => rooms.find((r) => r.id === id)?.name ?? id
  const placement = useMemo(() => allocate(rooms, bookings).byBooking, [rooms, bookings])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return bookings
      .map((booking) => ({ ...booking, status: statusOf(booking, now) }))
      .filter((booking) => filter === 'all' || booking.status === filter)
      .filter((booking) => {
        if (!needle) return true
        return [booking.guestName, booking.reference, booking.guestEmail]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle))
      })
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [bookings, query, filter, now])

  return (
    <div className="admin-page">
      <div className="res-controls">
        <div className="field res-search">
          <label htmlFor="res-q">Search</label>
          <input
            id="res-q"
            type="search"
            placeholder="Name, reference or email…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="sort" role="group" aria-label="Filter by status">
          {Object.entries(FILTERS).map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={`sort-btn${filter === key ? ' on' : ''}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="panel-note" role="status">
        {rows.length} of {bookings.length} reservations
      </p>

      <div className="table-scroll">
        <table className="res-table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Guest</th>
              <th scope="col">Room</th>
              <th scope="col">Arrive</th>
              <th scope="col">Depart</th>
              <th scope="col">Nights</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="table-empty">
                  Nothing matches that search.
                </td>
              </tr>
            )}

            {rows.map((booking) => {
              const unit = placement.get(booking.id)
              return (
                <tr key={booking.id}>
                  <td className="mono">{booking.reference}</td>
                  <td>
                    <span className="res-name">{booking.guestName || '—'}</span>
                    {booking.guestEmail && (
                      <span className="res-email">{booking.guestEmail}</span>
                    )}
                  </td>
                  <td>
                    {roomName(booking.roomId)}
                    {unit && unit.room.units > 1 && (
                      <span className="res-unit"> · no. {unit.index + 1}</span>
                    )}
                  </td>
                  <td>{formatShort(booking.checkIn)}</td>
                  <td>{formatShort(booking.checkOut)}</td>
                  <td>{nightsBetween(booking.checkIn, booking.checkOut)}</td>
                  <td>
                    {booking.total ? `${CURRENCY}${booking.total}` : '—'}
                  </td>
                  <td>
                    <span className={`pill ${booking.status}`}>{booking.status}</span>
                    {booking.source === 'staff' && <span className="pill desk">desk</span>}
                  </td>
                  <td className="res-actions">
                    {confirming === booking.id ? (
                      <>
                        <button
                          type="button"
                          className="link-btn danger"
                          onClick={async () => {
                            await onCancel(booking.id)
                            setConfirming(null)
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setConfirming(null)}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setConfirming(booking.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
