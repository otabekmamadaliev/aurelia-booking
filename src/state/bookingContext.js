import { createContext, useContext } from 'react'

/**
 * Kept apart from the provider component on purpose: a module that exports both
 * components and non-components breaks React Fast Refresh, and this one is
 * imported by every component in the app.
 */
export const BookingContext = createContext(null)

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) throw new Error('useBooking must be used inside <BookingProvider>')
  return context
}
