import { useEffect, useRef, useState } from 'react'
import { CURRENCY } from '../data/rooms'
import { formatShort, nightsBetween } from '../lib/date'
import { useBooking } from '../state/bookingContext'
import Calendar from './Calendar'

const MAX_GUESTS = 4

export default function BookingBar() {
  const {
    search,
    setRange,
    setGuests,
    blockedNights,
    minDate,
    maxDate,
    rangeIsValid,
    matches,
    cheapest,
    rooms,
    openFlow,
  } = useBooking()

  // Only one popover at a time: 'dates' | 'guests' | null.
  const [openPanel, setOpenPanel] = useState(null)
  const barRef = useRef(null)
  const datesTrigger = useRef(null)
  const guestsTrigger = useRef(null)

  useEffect(() => {
    if (!openPanel) return

    function handlePointerDown(event) {
      if (!barRef.current?.contains(event.target)) setOpenPanel(null)
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setOpenPanel(null)
      // Send focus back where it came from rather than dropping it on <body>.
      const trigger = openPanel === 'dates' ? datesTrigger : guestsTrigger
      trigger.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPanel])

  const nights = rangeIsValid ? nightsBetween(search.checkIn, search.checkOut) : 0

  function toggle(panel) {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  function handleSelectRange(checkIn, checkOut) {
    setRange(checkIn, checkOut)
    setOpenPanel(null)
    datesTrigger.current?.focus()
  }

  const roomsThatFit = rooms.filter((room) => room.maxGuests >= search.guests)

  return (
    <div className="wrap bookbar" id="book" ref={barRef}>
      <div className="bookbar-in">
        <div className="bb-cell">
          <button
            type="button"
            ref={datesTrigger}
            className="bb-trigger"
            aria-expanded={openPanel === 'dates'}
            aria-haspopup="dialog"
            onClick={() => toggle('dates')}
          >
            <span className="bb-label">Check-in</span>
            <span className="val">{formatShort(search.checkIn)}</span>
            <span className="sub">from 3:00 pm</span>
          </button>

          {openPanel === 'dates' && (
            <div className="pop" role="dialog" aria-label="Select your dates">
              <Calendar
                checkIn={search.checkIn}
                checkOut={search.checkOut}
                onSelect={handleSelectRange}
                blockedNights={blockedNights}
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          )}
        </div>

        <div className="bb-cell">
          <button
            type="button"
            className="bb-trigger"
            aria-expanded={openPanel === 'dates'}
            aria-haspopup="dialog"
            onClick={() => toggle('dates')}
          >
            <span className="bb-label">Check-out</span>
            <span className="val">{formatShort(search.checkOut)}</span>
            <span className="sub">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </button>
        </div>

        <div className="bb-cell">
          <button
            type="button"
            ref={guestsTrigger}
            className="bb-trigger"
            aria-expanded={openPanel === 'guests'}
            aria-haspopup="dialog"
            onClick={() => toggle('guests')}
          >
            <span className="bb-label">Guests</span>
            <span className="val">
              {search.guests} {search.guests === 1 ? 'adult' : 'adults'}
            </span>
            <span className="sub">1 room</span>
          </button>

          {openPanel === 'guests' && (
            <div className="pop" role="dialog" aria-label="How many guests">
              <div className="guest-row">
                <div>
                  <h3>Adults</h3>
                  <p>Children under 6 stay free</p>
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setGuests(Math.max(1, search.guests - 1))}
                    disabled={search.guests <= 1}
                    aria-label="One guest fewer"
                  >
                    −
                  </button>
                  <span className="count" aria-live="polite">
                    {search.guests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuests(Math.min(MAX_GUESTS, search.guests + 1))}
                    disabled={search.guests >= MAX_GUESTS}
                    aria-label="One guest more"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="cal-hint">
                {roomsThatFit.length} of {rooms.length} room types sleep{' '}
                {search.guests}.
              </p>
            </div>
          )}
        </div>

        <div className="bb-cell">
          <div className="bb-static">
            <span className="bb-label">Total from</span>
            <span className="val">
              {cheapest ? `${CURRENCY}${cheapest.total}` : '—'}
            </span>
            <span className="sub">
              {cheapest
                ? `${CURRENCY}${cheapest.rate} / night`
                : 'No rooms for these dates'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="bb-btn"
          onClick={() => openFlow()}
          disabled={!rangeIsValid}
        >
          Search
        </button>
      </div>

      <p className={`bookbar-note${matches.length === 0 ? ' warn' : ''}`} role="status">
        {matches.length > 0
          ? `${matches.length} of ${rooms.length} room types available for ${formatShort(
              search.checkIn,
            )} – ${formatShort(search.checkOut)}.`
          : 'Nothing free for these dates — try shifting your stay by a night or two.'}
      </p>
    </div>
  )
}
