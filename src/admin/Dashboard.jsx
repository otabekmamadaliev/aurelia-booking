import { CURRENCY } from '../data/rooms'
import { addDays, formatShort, today } from '../lib/date'
import {
  arrivalsOn,
  departuresOn,
  inHouseOn,
  occupancyByNight,
  performance,
} from '../lib/metrics'
import { allocate } from '../lib/allocation'

const pct = (n) => `${Math.round(n * 100)}%`
const money = (n) => `${CURRENCY}${Math.round(n).toLocaleString('en-GB')}`

function Kpi({ label, value, hint, tone }) {
  return (
    <div className={`kpi${tone ? ` ${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  )
}

function GuestList({ title, bookings, rooms, empty }) {
  const nameOf = (id) => rooms.find((r) => r.id === id)?.name ?? id

  return (
    <div className="panel">
      <h3>
        {title} <span className="count">{bookings.length}</span>
      </h3>
      {bookings.length === 0 ? (
        <p className="panel-empty">{empty}</p>
      ) : (
        <ul className="guest-list">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <span className="gl-name">{booking.guestName || '—'}</span>
              <span className="gl-room">{nameOf(booking.roomId)}</span>
              <span className="gl-ref">{booking.reference}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Dashboard({ rooms, bookings }) {
  const now = today()
  const horizon = addDays(now, 30)

  const month = performance(rooms, bookings, now, horizon)
  const tonight = occupancyByNight(rooms, bookings, now, addDays(now, 1))[0]
  const forward = occupancyByNight(rooms, bookings, now, addDays(now, 14))

  const arrivals = arrivalsOn(bookings, now)
  const departures = departuresOn(bookings, now)
  const inHouse = inHouseOn(bookings, now)

  const { unplaced } = allocate(rooms, bookings)
  const peak = Math.max(...forward.map((n) => n.occupancy), 0)

  return (
    <div className="admin-page">
      {unplaced.length > 0 && (
        <p className="notice" role="alert">
          <strong>{unplaced.length} reservation(s) could not be assigned a room.</strong>{' '}
          More stays exist than there are physical rooms — this should be
          impossible and means availability was bypassed somewhere.
        </p>
      )}

      <section className="kpi-row">
        <Kpi
          label="Occupancy tonight"
          value={pct(tonight?.occupancy ?? 0)}
          hint={`${tonight?.sold ?? 0} of ${tonight?.units ?? 0} rooms`}
        />
        <Kpi
          label="Occupancy · 30 days"
          value={pct(month.occupancy)}
          hint={`${month.roomNightsSold} of ${month.available} room-nights`}
        />
        <Kpi label="ADR · 30 days" value={money(month.adr)} hint="per room sold" />
        <Kpi
          label="RevPAR · 30 days"
          value={money(month.revpar)}
          hint="per room available"
        />
        <Kpi label="Rooms revenue" value={money(month.revenue)} hint="next 30 days" />
      </section>

      <section className="panel">
        <h3>Next fourteen nights</h3>
        <div className="bars" role="img" aria-label="Occupancy for the next fourteen nights">
          {forward.map((night) => (
            <div className="bar-col" key={night.night}>
              <div className="bar-track">
                <div
                  className={`bar-fill${night.occupancy >= 1 ? ' full' : ''}`}
                  style={{ height: `${Math.max(night.occupancy * 100, 2)}%` }}
                  title={`${formatShort(night.night)} — ${night.sold}/${night.units}`}
                />
              </div>
              <span className="bar-label">{night.night.slice(8)}</span>
            </div>
          ))}
        </div>
        <p className="panel-note">
          Busiest night ahead is {pct(peak)} full. Bars reaching the top are sold
          out — those are the nights struck out on the public calendar.
        </p>
      </section>

      <section className="panel-row">
        <GuestList
          title="Arriving today"
          bookings={arrivals}
          rooms={rooms}
          empty="No arrivals today."
        />
        <GuestList
          title="Departing today"
          bookings={departures}
          rooms={rooms}
          empty="No departures today."
        />
        <GuestList
          title="In house tonight"
          bookings={inHouse}
          rooms={rooms}
          empty="The house is empty tonight."
        />
      </section>
    </div>
  )
}
