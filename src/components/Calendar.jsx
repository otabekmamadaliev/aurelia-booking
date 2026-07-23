import { useEffect, useMemo, useRef, useState } from 'react'
import { rangeCrossesBlockedNight } from '../lib/availability'
import {
  addDays,
  addMonths,
  formatLong,
  fromISO,
  formatMonth,
  monthGrid,
  nightsBetween,
  startOfMonth,
} from '../lib/date'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function clamp(iso, min, max) {
  if (iso < min) return min
  if (iso > max) return max
  return iso
}

/**
 * Date-range picker with real availability baked in.
 *
 * Two rules do most of the work here:
 *  - a struck-out night cannot be an *arrival* date, but it can be a
 *    *departure* date, because checking out in the morning does not occupy
 *    that night;
 *  - a range may never span a struck-out night, so an attempt to do so
 *    restarts the selection from the date just clicked rather than silently
 *    producing a stay that cannot be sold.
 */
export default function Calendar({
  checkIn,
  checkOut,
  onSelect,
  blockedNights,
  minDate,
  maxDate,
}) {
  // Half-finished selections live here; the committed range stays in the store
  // until a complete, bookable pair has been chosen.
  const [draftStart, setDraftStart] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [message, setMessage] = useState(null)
  const [month, setMonth] = useState(() => startOfMonth(checkIn || minDate))
  const [focusedDate, setFocusedDate] = useState(checkIn || minDate)

  const cellRefs = useRef({})
  const shouldFocus = useRef(false)

  const selectingEnd = draftStart !== null
  const cells = useMemo(() => monthGrid(month), [month])

  // Move focus only when the keyboard drove the change, so opening the popover
  // does not yank focus and arrow keys never lose it after a month flip.
  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    cellRefs.current[focusedDate]?.focus()
  }, [focusedDate, month])

  const rangeStart = draftStart ?? checkIn
  const rangeEnd = draftStart ? (hovered > draftStart ? hovered : null) : checkOut

  function isDisabled(iso) {
    if (iso < minDate || iso > maxDate) return true
    // Fully-booked nights block arrivals only — see the note above.
    if (blockedNights.has(iso) && !selectingEnd) return true
    return false
  }

  function handlePick(iso) {
    if (isDisabled(iso)) return
    setMessage(null)

    if (!selectingEnd) {
      setDraftStart(iso)
      setHovered(null)
      return
    }

    if (iso <= draftStart) {
      // Clicking backwards means "actually, start here instead".
      setDraftStart(blockedNights.has(iso) ? null : iso)
      return
    }

    if (rangeCrossesBlockedNight(draftStart, iso, blockedNights)) {
      setMessage('That stay runs through a fully-booked night. Pick a shorter stay.')
      setDraftStart(null)
      return
    }

    onSelect(draftStart, iso)
    setDraftStart(null)
    setHovered(null)
  }

  function moveFocus(days) {
    const next = clamp(addDays(focusedDate, days), minDate, maxDate)
    shouldFocus.current = true
    setFocusedDate(next)
    if (startOfMonth(next) !== month) setMonth(startOfMonth(next))
  }

  function handleKeyDown(event) {
    const keys = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -28,
      PageDown: 28,
    }
    if (event.key in keys) {
      event.preventDefault()
      moveFocus(keys[event.key])
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const weekday = (fromISO(focusedDate).getDay() + 6) % 7
      moveFocus(event.key === 'Home' ? -weekday : 6 - weekday)
    }
  }

  const canGoBack = startOfMonth(minDate) < month
  const canGoForward = addMonths(month, 1) <= startOfMonth(maxDate)

  function shiftMonth(delta) {
    const next = addMonths(month, delta)
    setMonth(next)
    // Keep the roving tab stop inside the month now on screen.
    setFocusedDate((current) =>
      startOfMonth(current) === next ? current : clamp(next, minDate, maxDate),
    )
  }

  const nights =
    rangeStart && rangeEnd && rangeEnd > rangeStart
      ? nightsBetween(rangeStart, rangeEnd)
      : 0

  return (
    <div>
      <div className="cal-head">
        <b aria-live="polite">{formatMonth(month)}</b>
        <div className="cal-nav">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!canGoForward}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="cal"
        role="grid"
        aria-label="Choose your dates"
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(null)}
      >
        {WEEKDAYS.map((day) => (
          <span className="dow" key={day} role="columnheader" aria-label={day}>
            {day}
          </span>
        ))}

        {cells.map((cell) => {
          const disabled = isDisabled(cell.iso)
          const isStart = cell.iso === rangeStart
          const isEnd = cell.iso === rangeEnd
          const inRange =
            rangeStart && rangeEnd && cell.iso > rangeStart && cell.iso < rangeEnd

          const classes = ['d']
          if (!cell.inMonth) classes.push('mut')
          if (cell.iso < minDate) classes.push('past')
          if (blockedNights.has(cell.iso)) classes.push('booked')
          if (inRange) classes.push('in')
          if (isStart) classes.push('start')
          if (isEnd) classes.push('end')

          return (
            <button
              key={cell.iso}
              type="button"
              ref={(node) => {
                cellRefs.current[cell.iso] = node
              }}
              className={classes.join(' ')}
              disabled={disabled}
              tabIndex={cell.iso === focusedDate ? 0 : -1}
              aria-label={`${formatLong(cell.iso)}${
                blockedNights.has(cell.iso) ? ' — fully booked' : ''
              }`}
              aria-pressed={isStart || isEnd}
              onClick={() => handlePick(cell.iso)}
              onFocus={() => setFocusedDate(cell.iso)}
              onMouseEnter={() => !disabled && setHovered(cell.iso)}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <div className="cal-note">
        <span>
          <span className="dot" style={{ background: 'var(--green)' }} />
          Selected
        </span>
        <span>
          <span className="dot" style={{ background: '#efe7d7' }} />
          Your stay
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--muted)' }} />
          Unavailable
        </span>
      </div>

      <p className={`cal-hint${message ? ' warn' : ''}`} role="status">
        {message ??
          (selectingEnd
            ? 'Now pick your check-out date.'
            : nights > 0
              ? `${nights} ${nights === 1 ? 'night' : 'nights'} selected — click a date to start again.`
              : 'Click a date to start your stay.')}
      </p>
    </div>
  )
}
