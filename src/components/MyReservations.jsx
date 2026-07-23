import { CURRENCY, findRoom } from '../data/rooms'
import { formatShort, nightsBetween } from '../lib/date'
import { useBooking } from '../state/bookingContext'
import Reveal from './Reveal'

/**
 * Everything this browser has booked. Renders nothing until there is something
 * to show, which keeps a first visit identical to the approved design and makes
 * the localStorage persistence obvious on the second one.
 */
export default function MyReservations() {
  const { bookings, cancelBooking, resetDemo } = useBooking()
  const mine = bookings
    .filter((booking) => booking.source === 'guest')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (mine.length === 0) return null

  return (
    <section className="mine" id="reservations">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <p className="eyebrow">Your reservations</p>
            <h2>
              Saved on this device, <em>waiting for you.</em>
            </h2>
          </div>
          <button type="button" className="more" onClick={resetDemo}>
            Reset demo data
          </button>
        </Reveal>

        <Reveal className="mine-list">
          {mine.map((booking) => {
            const room = findRoom(booking.roomId)
            const nights = nightsBetween(booking.checkIn, booking.checkOut)

            return (
              <article className="mine-row" key={booking.id}>
                <div>
                  <span className="ref">{booking.reference}</span>
                  <h3>{room?.name ?? booking.roomId}</h3>
                  <p className="when">
                    {formatShort(booking.checkIn)} → {formatShort(booking.checkOut)} ·{' '}
                    {nights} {nights === 1 ? 'night' : 'nights'} · {booking.guests}{' '}
                    {booking.guests === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
                <div className="mine-right">
                  <div className="price">
                    <b>
                      {CURRENCY}
                      {booking.total}
                    </b>
                  </div>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => cancelBooking(booking.id)}
                  >
                    Cancel
                  </button>
                </div>
              </article>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
