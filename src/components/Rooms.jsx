import { CURRENCY } from '../data/rooms'
import { useBooking } from '../state/bookingContext'
import Photo from './Photo'
import Reveal from './Reveal'

/** Card is ~353px on desktop, half-width on tablet, full-bleed on phones. */
const ROOM_SIZES = '(max-width: 600px) 100vw, (max-width: 960px) 50vw, 360px'

export default function Rooms() {
  const { rooms, roomAvailability, openFlow, search } = useBooking()

  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <p className="eyebrow">Rooms &amp; Suites</p>
            <h2>
              Nineteen rooms, <em>each one different.</em>
            </h2>
          </div>
          <button type="button" className="more" onClick={() => openFlow()}>
            View all rooms
          </button>
        </Reveal>

        <Reveal className="room-grid">
          {rooms.map((room) => {
            const state = roomAvailability[room.id] ?? {}
            const bookable = state.fitsParty && state.free

            let status = 'Available for your dates'
            let statusClass = 'free'
            if (!state.fitsParty) {
              status = `Sleeps up to ${room.maxGuests}`
              statusClass = 'taken'
            } else if (!state.free) {
              status = 'Booked for your dates'
              statusClass = 'taken'
            }

            return (
              <article className="room" key={room.id}>
                <div className={`room-art ${room.art}`}>
                  <Photo
                    src={room.photo.large}
                    srcSet={`${room.photo.small} 420w, ${room.photo.large} 800w`}
                    sizes={ROOM_SIZES}
                    alt={room.photo.alt}
                  />
                  <span className="room-tag">{room.tag}</span>
                </div>
                <div className="room-body">
                  <h3>{room.name}</h3>
                  <div className="room-meta">
                    <span>{room.size}</span>
                    <span aria-hidden="true">·</span>
                    <span>{room.maxGuests} guests</span>
                    <span aria-hidden="true">·</span>
                    <span>{room.feature}</span>
                  </div>
                  <p className="room-desc">{room.description}</p>

                  <p className={`room-status ${statusClass}`}>
                    <span
                      className="dot"
                      style={{
                        background: bookable ? 'var(--green)' : 'var(--muted)',
                      }}
                    />
                    {status}
                  </p>

                  <div className="room-foot">
                    <div className="price">
                      <b>
                        {CURRENCY}
                        {room.rate}
                      </b>{' '}
                      <span>/ night</span>
                    </div>
                    <button
                      type="button"
                      className="room-link"
                      disabled={!bookable}
                      onClick={() => openFlow(room.id)}
                      aria-label={
                        bookable
                          ? `Reserve the ${room.name} for ${search.guests} guests`
                          : `${room.name} is unavailable for your dates`
                      }
                    >
                      {bookable ? 'Reserve →' : 'Unavailable'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
