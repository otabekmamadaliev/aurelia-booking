/**
 * Orders offered above the results list.
 *
 * Kept out of the provider because a module exporting both components and
 * plain values breaks React Fast Refresh — the same reason `bookingContext`
 * lives apart from `BookingProvider`.
 */
export const SORTS = {
  price: {
    label: 'Price',
    compare: (a, b) => a.rate - b.rate,
  },
  space: {
    // Sleeps the most first; rate breaks ties so the order is never arbitrary.
    label: 'Space',
    compare: (a, b) => b.maxGuests - a.maxGuests || b.rate - a.rate,
  },
}

export const DEFAULT_SORT = 'price'

export function compareFor(sort) {
  return (SORTS[sort] ?? SORTS[DEFAULT_SORT]).compare
}
