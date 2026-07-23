import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  availableRooms,
  cheapestOption,
  fullyBookedNights,
  isRoomAvailable,
  isValidRange,
  priceFor,
} from '../lib/availability'
import { addDays, today } from '../lib/date'
import { bookingRepository, roomRepository } from '../lib/repository'
import { sendBookingEmails } from '../lib/email'
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
    error: null,
  })

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
   * when the party size changes, because a family of four has fewer rooms to
   * lose before a night is genuinely unbookable.
   */
  const blockedNights = useMemo(
    () => fullyBookedNights(rooms, bookings, search.guests, minDate, maxDate),
    [rooms, bookings, search.guests, minDate, maxDate],
  )

  const rangeIsValid = isValidRange(search.checkIn, search.checkOut)

  const matches = useMemo(() => {
    if (!rangeIsValid) return []
    return availableRooms(rooms, bookings, search.checkIn, search.checkOut, search.guests)
  }, [rooms, bookings, search, rangeIsValid])

  const cheapest = useMemo(() => {
    if (!rangeIsValid) return null
    return cheapestOption(rooms, bookings, search.checkIn, search.checkOut, search.guests)
  }, [rooms, bookings, search, rangeIsValid])

  const roomAvailability = useMemo(() => {
    const map = {}
    for (const room of rooms) {
      map[room.id] = {
        fitsParty: room.maxGuests >= search.guests,
        free:
          rangeIsValid && isRoomAvailable(room, bookings, search.checkIn, search.checkOut),
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

  const openFlow = useCallback((roomId = null) => {
    setFlow({
      open: true,
      step: roomId ? 'details' : 'rooms',
      roomId,
      booking: null,
      emailSent: null,
      submitting: false,
      error: null,
    })
  }, [])

  const closeFlow = useCallback(() => {
    setFlow((prev) => ({ ...prev, open: false }))
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
        // Almost always UnavailableError: someone took the room in another tab.
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
    minDate,
    maxDate,
    blockedNights,
    rangeIsValid,
    matches,
    cheapest,
    roomAvailability,
    flow,
    openFlow,
    closeFlow,
    chooseRoom,
    backToRooms,
    confirmBooking,
    cancelBooking,
    resetDemo,
  }

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}
