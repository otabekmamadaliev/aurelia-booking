import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { priceFor } from '../lib/availability'
import { CURRENCY, findRoom } from '../data/rooms'
import { formatLong, formatShort, nightsBetween } from '../lib/date'
import { EMAIL_CONFIG } from '../lib/email'
import { useBooking } from '../state/bookingContext'
import Photo from './Photo'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

const STEP_LABELS = [
  { key: 'rooms', label: '1 · Choose a room' },
  { key: 'details', label: '2 · Guest details' },
  { key: 'confirmation', label: '3 · Confirmation' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function BookingFlow() {
  const {
    flow,
    closeFlow,
    chooseRoom,
    backToRooms,
    confirmBooking,
    search,
    matches,
    rooms,
    roomAvailability,
  } = useBooking()

  const sheetRef = useRef(null)
  const restoreFocusTo = useRef(null)
  const reduceMotion = useReducedMotion()

  /**
   * Modal focus management: remember what was focused, move focus inside, keep
   * Tab from escaping, and hand focus back on close.
   */
  useEffect(() => {
    if (!flow.open) return
    restoreFocusTo.current = document.activeElement

    const sheet = sheetRef.current
    sheet?.querySelector(FOCUSABLE)?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeFlow()
        return
      }
      if (event.key !== 'Tab' || !sheet) return

      const items = [...sheet.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null,
      )
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      restoreFocusTo.current?.focus?.()
    }
  }, [flow.open, closeFlow])

  const nights = nightsBetween(search.checkIn, search.checkOut)
  const activeIndex = STEP_LABELS.findIndex((step) => step.key === flow.step)

  function handleChangeDates() {
    closeFlow()
    document.getElementById('book')?.scrollIntoView({ block: 'center' })
  }

  return (
    <AnimatePresence>
      {flow.open && (
        <motion.div
          className="overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFlow()
          }}
        >
          <motion.div
            className="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-title"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="sheet-head">
              <div>
                <h2 id="flow-title">
                  {flow.step === 'confirmation' ? 'You are booked' : 'Reserve your stay'}
                </h2>
                <p className="summary">
                  {formatShort(search.checkIn)} → {formatShort(search.checkOut)} ·{' '}
                  {nights} {nights === 1 ? 'night' : 'nights'} · {search.guests}{' '}
                  {search.guests === 1 ? 'guest' : 'guests'}
                </p>
              </div>
              <button
                type="button"
                className="sheet-close"
                onClick={closeFlow}
                aria-label="Close reservation"
              >
                ✕
              </button>
            </div>

            <ol className="steps">
              {STEP_LABELS.map((step, index) => (
                <li
                  key={step.key}
                  className={
                    index === activeIndex ? 'on' : index < activeIndex ? 'done' : ''
                  }
                  aria-current={index === activeIndex ? 'step' : undefined}
                >
                  {step.label}
                </li>
              ))}
            </ol>

            <div className="sheet-body">
              {flow.error && <p className="notice">{flow.error}</p>}

              {flow.step === 'rooms' && (
                <RoomStep
                  matches={matches}
                  rooms={rooms}
                  roomAvailability={roomAvailability}
                  search={search}
                  onChoose={chooseRoom}
                  onChangeDates={handleChangeDates}
                />
              )}

              {flow.step === 'details' && (
                <DetailsStep
                  room={findRoom(flow.roomId)}
                  search={search}
                  submitting={flow.submitting}
                  onBack={backToRooms}
                  onSubmit={confirmBooking}
                />
              )}

              {flow.step === 'confirmation' && flow.booking && (
                <ConfirmationStep
                  booking={flow.booking}
                  emailSent={flow.emailSent}
                  onDone={closeFlow}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ step 1 */

function RoomStep({ matches, rooms, roomAvailability, search, onChoose, onChangeDates }) {
  const tooSmall = rooms.filter((room) => room.maxGuests < search.guests)
  const taken = rooms.filter(
    (room) => room.maxGuests >= search.guests && !roomAvailability[room.id]?.free,
  )

  if (matches.length === 0) {
    return (
      <div className="empty">
        <h3>Nothing free for those dates</h3>
        <p>
          Every room that sleeps {search.guests} is taken for this stay. Shifting your
          arrival by a night is usually enough.
        </p>
        <button type="button" className="btn btn-green" onClick={onChangeDates}>
          Change dates
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="option-list">
        {matches.map((room) => {
          const { total } = priceFor(room, search.checkIn, search.checkOut)
          return (
            <button
              type="button"
              className="option"
              key={room.id}
              onClick={() => onChoose(room.id)}
            >
              <span className={`option-art ${room.art}`}>
                {/* Same fade-over-gradient treatment as everywhere else, so a
                    thumbnail that fails to load shows the gradient rather than
                    a broken-image glyph. `priority` because the modal shows
                    these the moment it opens. */}
                <Photo src={room.photo.small} alt="" priority />
              </span>
              <span className="option-main">
                <h3>{room.name}</h3>
                <p>
                  {room.size} · sleeps {room.maxGuests} · {room.feature}
                </p>
              </span>
              <span className="option-price">
                <b>
                  {CURRENCY}
                  {total}
                </b>
                <span>
                  {CURRENCY}
                  {room.rate} / night
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {(taken.length > 0 || tooSmall.length > 0) && (
        <p className="notice soft" style={{ marginTop: 22, marginBottom: 0 }}>
          {taken.length > 0 && (
            <>
              Already booked for these dates: {taken.map((r) => r.name).join(', ')}.{' '}
            </>
          )}
          {tooSmall.length > 0 && (
            <>Too small for {search.guests} guests: {tooSmall.map((r) => r.name).join(', ')}.</>
          )}
        </p>
      )}

      <div className="actions" style={{ marginTop: 24 }}>
        <button type="button" className="link-btn" onClick={onChangeDates}>
          Change dates
        </button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ step 2 */

function DetailsStep({ room, search, submitting, onBack, onSubmit }) {
  const [values, setValues] = useState({ guestName: '', guestEmail: '', notes: '' })
  const [errors, setErrors] = useState({})

  if (!room) return null
  const { nights, total } = priceFor(room, search.checkIn, search.checkOut)

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (values.guestName.trim().length < 2) {
      nextErrors.guestName = 'Please tell us who the room is for.'
    }
    if (!EMAIL_PATTERN.test(values.guestEmail.trim())) {
      nextErrors.guestEmail = 'We need a valid address to send the confirmation to.'
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      // Move focus to the first problem so keyboard users are not left guessing.
      document.getElementById(Object.keys(nextErrors)[0])?.focus()
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="receipt">
        <div className="receipt-line">
          <span>Room</span>
          <span>{room.name}</span>
        </div>
        <div className="receipt-line">
          <span>Arrival</span>
          <span>{formatLong(search.checkIn)}</span>
        </div>
        <div className="receipt-line">
          <span>Departure</span>
          <span>{formatLong(search.checkOut)}</span>
        </div>
        <div className="receipt-line">
          <span>
            {nights} × {CURRENCY}
            {room.rate}
          </span>
          <span>
            {CURRENCY}
            {total}
          </span>
        </div>
        <div className="receipt-total">
          <span className="lbl">Total</span>
          <b>
            {CURRENCY}
            {total}
          </b>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="guestName">Full name</label>
          <input
            id="guestName"
            name="guestName"
            type="text"
            autoComplete="name"
            value={values.guestName}
            onChange={(event) => update('guestName', event.target.value)}
            aria-invalid={Boolean(errors.guestName)}
            aria-describedby={errors.guestName ? 'guestName-error' : undefined}
          />
          {errors.guestName && (
            <p className="err" id="guestName-error">
              {errors.guestName}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="guestEmail">Email</label>
          <input
            id="guestEmail"
            name="guestEmail"
            type="email"
            autoComplete="email"
            value={values.guestEmail}
            onChange={(event) => update('guestEmail', event.target.value)}
            aria-invalid={Boolean(errors.guestEmail)}
            aria-describedby={errors.guestEmail ? 'guestEmail-error' : undefined}
          />
          {errors.guestEmail && (
            <p className="err" id="guestEmail-error">
              {errors.guestEmail}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Anything we should know? (optional)</label>
        <textarea
          id="notes"
          name="notes"
          maxLength={500}
          placeholder="Late arrival, dietary needs, a quiet floor…"
          value={values.notes}
          onChange={(event) => update('notes', event.target.value)}
        />
      </div>

      <div className="actions">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Other rooms
        </button>
        <span className="spacer" />
        <button type="submit" className="btn btn-gold" disabled={submitting}>
          {submitting ? 'Reserving…' : `Confirm — ${CURRENCY}${total}`}
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ step 3 */

function ConfirmationStep({ booking, emailSent, onDone }) {
  const room = findRoom(booking.roomId)
  const nights = nightsBetween(booking.checkIn, booking.checkOut)

  return (
    <div>
      <div className="confirm-head">
        <div className="confirm-mark" aria-hidden="true">
          ✓
        </div>
        <h3>{booking.guestName}, your room is held.</h3>
        <p>Free cancellation until 7 days before arrival.</p>
        <p className="ref-badge">{booking.reference}</p>
      </div>

      <div className="receipt">
        <div className="receipt-line">
          <span>Room</span>
          <span>{room?.name ?? booking.roomId}</span>
        </div>
        <div className="receipt-line">
          <span>Stay</span>
          <span>
            {formatLong(booking.checkIn)} → {formatLong(booking.checkOut)}
          </span>
        </div>
        <div className="receipt-line">
          <span>Nights</span>
          <span>{nights}</span>
        </div>
        <div className="receipt-line">
          <span>Guests</span>
          <span>{booking.guests}</span>
        </div>
        {booking.notes && (
          <div className="receipt-line">
            <span>Notes</span>
            <span>{booking.notes}</span>
          </div>
        )}
        <div className="receipt-total">
          <span className="lbl">Paid on arrival</span>
          <b>
            {CURRENCY}
            {booking.total}
          </b>
        </div>
      </div>

      <p className="notice soft" role="status">
        {emailSent === null && 'Sending your confirmation email…'}
        {emailSent === true && (
          <>
            Confirmation sent to <strong>{booking.guestEmail}</strong>, with a copy to{' '}
            {EMAIL_CONFIG.hotelEmail}.
          </>
        )}
        {emailSent === false && (
          <>
            Your reservation is saved, but the confirmation email could not be sent.
            Quote <strong>{booking.reference}</strong> on arrival.
          </>
        )}
      </p>

      <div className="actions" style={{ marginTop: 22 }}>
        <span className="spacer" />
        <button type="button" className="btn btn-green" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
