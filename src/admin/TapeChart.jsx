import { useMemo, useState } from 'react'
import { occupancyGrid, physicalUnits } from '../lib/allocation'
import { addDays, fromISO, today } from '../lib/date'

const SPAN = 14

/**
 * The tape chart — physical rooms down the side, nights across the top.
 *
 * This is the view hoteliers ask for by name, and the reason the allocation
 * module exists: the booking side sells room *types*, but a chart has to show
 * room 2 of 4, because that is what housekeeping cleans and what the guest is
 * handed a key to.
 *
 * A stay is drawn as one continuous run rather than as separate blocks per
 * night, so the eye reads it as a single reservation. Only the first cell of a
 * run carries the guest's name; the rest are visually joined to it.
 */
export default function TapeChart({ rooms, bookings, onSelect }) {
  const [start, setStart] = useState(() => today())

  const units = useMemo(() => physicalUnits(rooms), [rooms])
  const end = addDays(start, SPAN)

  const { nights, grid } = useMemo(
    () => occupancyGrid(rooms, bookings, start, end),
    [rooms, bookings, start, end],
  )

  const now = today()

  return (
    <div className="admin-page">
      <div className="chart-head">
        <div>
          <h3>Room chart</h3>
          <p className="panel-note">
            {units.length} rooms · {SPAN} nights from {start}
          </p>
        </div>
        <div className="chart-nav">
          <button type="button" onClick={() => setStart(addDays(start, -7))}>
            ‹ Earlier
          </button>
          <button type="button" onClick={() => setStart(now)}>
            Today
          </button>
          <button type="button" onClick={() => setStart(addDays(start, 7))}>
            Later ›
          </button>
        </div>
      </div>

      <div className="chart-scroll">
        <div
          className="chart"
          style={{ gridTemplateColumns: `170px repeat(${nights.length}, minmax(46px, 1fr))` }}
        >
          <div className="chart-corner">Room</div>
          {nights.map((night) => {
            const date = fromISO(night)
            const weekend = [0, 6].includes(date.getDay())
            return (
              <div
                className={`chart-day${weekend ? ' weekend' : ''}${
                  night === now ? ' is-today' : ''
                }`}
                key={night}
              >
                <span className="cd-dow">
                  {date.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                </span>
                <span className="cd-num">{night.slice(8)}</span>
              </div>
            )
          })}

          {units.map((unit) => {
            const row = grid.get(unit.key) ?? []
            return (
              <Row key={unit.key} unit={unit} row={row} onSelect={onSelect} today={now} />
            )
          })}
        </div>
      </div>

      <ul className="chart-legend">
        <li>
          <span className="swatch guest" /> Guest booking
        </li>
        <li>
          <span className="swatch staff" /> Taken at the desk
        </li>
        <li>
          <span className="swatch seed" /> House booking
        </li>
        <li>
          <span className="swatch free" /> Available
        </li>
      </ul>
    </div>
  )
}

function Row({ unit, row, onSelect, today: now }) {
  return (
    <>
      <div className="chart-room" title={unit.label}>
        {unit.label}
      </div>
      {row.map((cell, i) => {
        const booking = cell.booking
        const prev = row[i - 1]?.booking
        const next = row[i + 1]?.booking

        if (!booking) {
          return (
            <div
              className={`chart-cell free${cell.night === now ? ' is-today' : ''}`}
              key={cell.night}
            />
          )
        }

        const startsHere = prev?.id !== booking.id
        const endsHere = next?.id !== booking.id

        const classes = ['chart-cell', 'taken', booking.source ?? 'guest']
        if (startsHere) classes.push('run-start')
        if (endsHere) classes.push('run-end')
        if (cell.night === now) classes.push('is-today')

        return (
          <button
            type="button"
            className={classes.join(' ')}
            key={cell.night}
            onClick={() => onSelect?.(booking)}
            title={`${booking.guestName || 'Reserved'} · ${booking.reference} · ${
              booking.checkIn
            } → ${booking.checkOut}`}
          >
            {startsHere && (
              <span className="cell-name">{booking.guestName || 'Reserved'}</span>
            )}
          </button>
        )
      })}
    </>
  )
}
