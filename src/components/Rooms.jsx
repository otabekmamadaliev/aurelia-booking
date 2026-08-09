import { useId, useMemo, useState } from 'react'
import { CURRENCY, TOTAL_UNITS } from '../data/rooms'
import { useBooking } from '../state/bookingContext'
import Photo from './Photo'
import Reveal from './Reveal'

/** Card is ~353px on desktop, half-width on tablet, full-bleed on phones. */
const ROOM_SIZES = '(max-width: 600px) 100vw, (max-width: 960px) 50vw, 360px'

/** How many cards show before "View all rooms" is needed. */
const PREVIEW_COUNT = 6

/**
 * What the card says about this room for the chosen dates.
 *
 * Scarcity is measured against the type's own inventory, not against a flat
 * number. A type with two rooms that has sold neither is not "only 2 left" —
 * that would be manufactured urgency, and it is the exact trick this kind of
 * site is usually caught doing. A warning appears only when units have
 * genuinely been sold, and it disappears again the moment the guest widens
 * their dates.
 */
function statusFor(room, state) {
  if (!state.fitsParty) {
    return { text: `Sleeps up to ${room.maxGuests}`, tone: 'taken' }
  }
  if (state.left <= 0) return { text: 'Booked for your dates', tone: 'taken' }

  const sold = room.units - state.left
  if (sold === 0) return { text: 'Available for your dates', tone: 'free' }
  if (state.left === 1) return { text: 'Last one for your dates', tone: 'scarce' }
  return { text: `${state.left} of ${room.units} left`, tone: 'scarce' }
}

export default function Rooms() {
  const { rooms, roomAvailability, openFlow, search } = useBooking()
  const [expanded, setExpanded] = useState(false)
  const gridId = useId()

  /**
   * Bookable rooms first, cheapest within each group.
   *
   * Without this the grid stays in pure price order and the preview can hide
   * every room a guest can actually book — a party of five sees six "sleeps up
   * to two" cards and has to expand the list to find the one chalet that fits
   * them. Sorting by relevance keeps the catalogue honest about price while
   * putting what is purchasable in front.
   */
  const ordered = useMemo(() => {
    const rank = (room) => {
      const state = roomAvailability[room.id]
      if (!state?.fitsParty) return 2
      return state.left > 0 ? 0 : 1
    }
    return [...rooms].sort((a, b) => rank(a) - rank(b) || a.rate - b.rate)
  }, [rooms, roomAvailability])

  const hasMore = ordered.length > PREVIEW_COUNT
  const visible = expanded || !hasMore ? ordered : ordered.slice(0, PREVIEW_COUNT)
  const hidden = ordered.length - visible.length

  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <p className="eyebrow">Rooms &amp; Suites</p>
            <h2>
              {TOTAL_UNITS} rooms, <em>each one different.</em>
            </h2>
          </div>
          {hasMore && (
            <button
              type="button"
              className="more"
              aria-expanded={expanded}
              aria-controls={gridId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? 'Show fewer' : `View all ${ordered.length} types`}
            </button>
          )}
        </Reveal>

        <Reveal className="room-grid" id={gridId}>
          {visible.map((room) => {
            const state = roomAvailability[room.id] ?? { fitsParty: false, left: 0 }
            const bookable = state.fitsParty && state.left > 0
            const status = statusFor(room, state)

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
                    <span>
                      {room.maxGuests} {room.maxGuests === 1 ? 'guest' : 'guests'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{room.feature}</span>
                  </div>
                  <p className="room-desc">{room.description}</p>

                  <p className={`room-status ${status.tone}`}>
                    <span className="dot" aria-hidden="true" />
                    {status.text}
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
                          ? `Reserve the ${room.name} for ${search.guests} ${
                              search.guests === 1 ? 'guest' : 'guests'
                            }`
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

        {hasMore && !expanded && (
          <p className="room-more-note">
            <button type="button" className="link-btn" onClick={() => setExpanded(true)}>
              Show {hidden} more room {hidden === 1 ? 'type' : 'types'}
            </button>
          </p>
        )}
      </div>
    </section>
  )
}
