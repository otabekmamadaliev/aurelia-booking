import { useCallback, useEffect, useState } from 'react'
import { bookingRepository, roomRepository } from '../lib/repository'

/**
 * The admin's own slice of data.
 *
 * Deliberately not sharing `BookingProvider`. The guest side is a shopping
 * session — it holds a search, a wizard step, a party size. Staff need none of
 * that and do need things a guest must never have, like cancelling somebody
 * else's reservation. They are two different applications that happen to read
 * the same tables, and modelling them that way now is what keeps the guest
 * context from slowly growing an admin-shaped bulge.
 *
 * Reads go straight through the repository, so when that file starts talking to
 * a real backend the admin follows without changing.
 */
export function useAdminData() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [roomList, bookingList] = await Promise.all([
        roomRepository.list(),
        bookingRepository.list(),
      ])
      setRooms(roomList)
      setBookings(bookingList)
      setError(null)
    } catch (cause) {
      setError(cause.message ?? 'Could not load reservations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const cancel = useCallback(
    async (bookingId) => {
      await bookingRepository.cancelAsStaff(bookingId)
      await refresh()
    },
    [refresh],
  )

  const create = useCallback(
    async (draft) => {
      const booking = await bookingRepository.create({ ...draft, source: 'staff' })
      await refresh()
      return booking
    },
    [refresh],
  )

  return { rooms, bookings, loading, error, refresh, cancel, create }
}
