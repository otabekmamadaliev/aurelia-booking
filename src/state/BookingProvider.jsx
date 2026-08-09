import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  availableRooms,
  cheapestOption,
  fullyBookedNights,
  isValidRange,
  priceFor,
  unitsLeft,
} from '../lib/availability'
import { addDays, today } from '../lib/date'
import { bookingRepository, roomRepository } from '../lib/repository'
import { sendBookingEmails } from '../lib/email'
import { compareFor, DEFAULT_SORT } from '../lib/sortOrders'
import { BookingContext } from './bookingContext'

/** How far ahead reservations are open. Also bounds the calendar. */
const BOOKING_HORIZON_DAYS = 365

const DEFAULT_STAY = { checkInOffset: 2, nights: 3 }

export function BookingProvider({ children }) {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState(() => {
    const start = addDays(today(), DEFAULT_STAY.checkInOffset)
    return {
      checkIn: start,
      checkOut: addDays(start, DEFAULT_STAY.nights),
      guests: 2,
    }
  })

  // The reservation wizard. `step` is one of: rooms | details | confirmation.
  const [flow, setFlow] = useState({
    open: false,
    step: 'rooms',
    roomId: null,
    booking: null,
    emailSent: null,
    submitting: false,
    searching: false,
    sort: DEFAULT_SORT,
    error: null,
  })

  /**
   * Identifies the most recent search. A guest who hits Search twice starts two
   * round-trips, and without this the slower one could land last and overwrite
   * the newer results.
   */
  const searchToken = useRef(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([roomRepository.list(), bookingRepository.list()]).then(
      ([roomList, bookingList]) => {
        if (cancelled) return
        setRooms(roomList)
        setBookings(bookingList)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const minDate = today()
  const maxDate = addDays(minDate, BOOKING_HORIZON_DAYS)

  /**
   * Nights where every room that fits the party is already taken. Recomputed
   * when the party size changes, because a family of five has far fewer rooms
   * to lose before a night is genuinely unbookable.
   */
  const blockedNights = useMemo(
    () => fullyBookedNights(rooms, bookings, search.guests, minDate, maxDate),
    [rooms, bookings, search.guests, minDate, maxDate],
  )

  const rangeIsValid = isValidRange(search.checkIn, search.checkOut)

  const matches = useMemo(() => {
    if (!rangeIsValid) return []
    const found = availableRooms(
      rooms,
      bookings,
      search.checkIn,
      search.checkOut,
      search.guests,
    )
    return [...found].sort(compareFor(flow.sort))
  }, [rooms, bookings, search, rangeIsValid, flow.sort])

  const cheapest = useMemo(() => {
    if (!rangeIsValid) return null
    return cheapestOption(rooms, bookings, search.checkIn, search.checkOut, search.guests)
  }, [rooms, bookings, search, rangeIsValid])

  /**
   * Per-room state for the cards: does it fit the party, and how many of its
   * units are still sellable for these dates. `left` drives the scarcity note,
   * so "last one" is derived from inventory rather than written by hand.
   */
  const roomAvailability = useMemo(() => {
    const map = {}
    for (const room of rooms) {
      const left = rangeIsValid
        ? unitsLeft(room, bookings, search.checkIn, search.checkOut)
        : 0
      map[room.id] = {
        fitsParty: room.maxGuests >= search.guests,
        free: left > 0,
        left,
      }
    }
    return map
  }, [rooms, bookings, search, rangeIsValid])

  const setRange = useCallback((checkIn, checkOut) => {
    setSearch((prev) => ({ ...prev, checkIn, checkOut }))
  }, [])

  const setGuests = useCallback((guests) => {
    setSearch((prev) => ({ ...prev, guests }))
  }, [])

  const setSort = useCallback((sort) => {
    setFlow((prev) => ({ ...prev, sort }))
  }, [])

  /** Open the wizard directly, with no round-trip — used by the room cards. */
  const openFlow = useCallback((roomId = null) => {
    setFlow((prev) => ({
      ...prev,
      open: true,
      step: roomId ? 'details' : 'rooms',
      roomId,
      booking: null,
      emailSent: null,
      submitting: false,
      searching: false,
      error: null,
    }))
  }, [])

  /**
   * Open the wizard on a fresh availability search. Results are hidden behind a
   * loading state until the store answers, which is also when another tab's
   * reservations get picked up.
   */
  const runSearch = useCallback(async () => {
    const token = (searchToken.current += 1)

    setFlow((prev) => ({
      ...prev,
      open: true,
      step: 'rooms',
      roomId: null,
      booking: null,
      emailSent: null,
      submitting: false,
      searching: true,
      error: null,
    }))

    const fresh = await bookingRepository.search()
    if (token !== searchToken.current) return // a newer search superseded this one

    setBookings(fresh)
    // Leave a closed sheet closed — the guest dismissed it mid-flight.
    setFlow((prev) => (prev.open ? { ...prev, searching: false } : prev))
  }, [])

  const closeFlow = useCallback(() => {
    // Abandons any in-flight search so its result cannot reopen the results.
    searchToken.current += 1
    setFlow((prev) => ({ ...prev, open: false, searching: false }))
  }, [])

  const chooseRoom = useCallback((roomId) => {
    setFlow((prev) => ({ ...prev, roomId, step: 'details', error: null }))
  }, [])

  const backToRooms = useCallback(() => {
    setFlow((prev) => ({ ...prev, step: 'rooms', error: null }))
  }, [])

  /**
   * Commit the reservation, then try to e-mail it.
   *
   * Order matters: the booking is persisted first and the guest is shown the
   * confirmation regardless of what the mail provider does. A failed send is
   * reported as a note on an otherwise successful reservation, never as a
   * failed reservation.
   */
  const confirmBooking = useCallback(
    async (guestDetails) => {
      const room = rooms.find((r) => r.id === flow.roomId)
      if (!room) return

      setFlow((prev) => ({ ...prev, submitting: true, error: null }))
      const { total } = priceFor(room, search.checkIn, search.checkOut)

      try {
        const booking = await bookingRepository.create({
          roomId: room.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          guests: search.guests,
          total,
          ...guestDetails,
        })

        setBookings(await bookingRepository.list())
        setFlow((prev) => ({
          ...prev,
          step: 'confirmation',
          booking,
          submitting: false,
        }))

        const result = await sendBookingEmails(booking)
        setFlow((prev) => ({ ...prev, emailSent: result.ok }))
      } catch (error) {
        // Almost always UnavailableError: someone took the last unit elsewhere.
        setBookings(await bookingRepository.list())
        setFlow((prev) => ({
          ...prev,
          submitting: false,
          step: 'rooms',
          roomId: null,
          error: error.message,
        }))
      }
    },
    [rooms, flow.roomId, search],
  )

  const cancelBooking = useCallback(async (bookingId) => {
    await bookingRepository.cancel(bookingId)
    setBookings(await bookingRepository.list())
  }, [])

  const resetDemo = useCallback(async () => {
    setBookings(await bookingRepository.reset())
  }, [])

  const value = {
    rooms,
    bookings,
    loading,
    search,
    setRange,
    setGuests,
    setSort,
    minDate,
    maxDate,
    blockedNights,
    rangeIsValid,
    matches,
    cheapest,
    roomAvailability,
    flow,
    openFlow,
    runSearch,
    closeFlow,
    chooseRoom,
    backToRooms,
    confirmBooking,
    cancelBooking,
    resetDemo,
  }

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}
