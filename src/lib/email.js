import emailjs from '@emailjs/browser'
import { CURRENCY, findRoom } from '../data/rooms'
import { formatLong, nightsBetween } from './date'

/**
 * Confirmation e-mail delivery via EmailJS.
 *
 * Config falls back to baked-in values so a fresh clone or a fresh Vercel
 * project works with no environment setup. These are publishable identifiers —
 * an EmailJS public key is designed to sit in client bundles — but they are
 * still read from `import.meta.env` first so they can be rotated per
 * deployment without a code change.
 */
const CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_3o04ar1',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_booking',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'C_whB4tAE2ZQWGiHA',
  hotelEmail: import.meta.env.VITE_HOTEL_EMAIL || 'contact@otabekmamadaliev.com',
}

function buildParams(booking, { toEmail, toName, recipientKind }) {
  const room = findRoom(booking.roomId)
  const nights = nightsBetween(booking.checkIn, booking.checkOut)

  return {
    to_email: toEmail,
    to_name: toName,
    recipient_kind: recipientKind,
    reference: booking.reference,
    room_name: room?.name ?? booking.roomId,
    check_in: formatLong(booking.checkIn),
    check_out: formatLong(booking.checkOut),
    nights: `${nights} ${nights === 1 ? 'night' : 'nights'}`,
    guests: `${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}`,
    rate: `${CURRENCY}${room?.rate ?? 0}`,
    total: `${CURRENCY}${booking.total}`,
    guest_name: booking.guestName,
    guest_email: booking.guestEmail,
    notes: booking.notes || '—',
  }
}

/**
 * Send the guest their confirmation and the hotel its copy.
 *
 * Deliberately never throws: the reservation is already committed by the time
 * this runs, and a bounced e-mail must not make the guest think their room did
 * not get booked. The caller shows a quiet note instead.
 */
export async function sendBookingEmails(booking) {
  const messages = [
    buildParams(booking, {
      toEmail: booking.guestEmail,
      toName: booking.guestName,
      recipientKind: 'guest',
    }),
    buildParams(booking, {
      toEmail: CONFIG.hotelEmail,
      toName: 'Aurelia reservations',
      recipientKind: 'hotel',
    }),
  ]

  try {
    // Sequential rather than parallel: EmailJS rate-limits bursts from one key.
    for (const params of messages) {
      await emailjs.send(CONFIG.serviceId, CONFIG.templateId, params, {
        publicKey: CONFIG.publicKey,
      })
    }
    return { ok: true }
  } catch (error) {
    console.error('[aurelia] confirmation e-mail failed', error)
    return { ok: false, error }
  }
}

export const EMAIL_CONFIG = CONFIG
