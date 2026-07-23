import { useBooking } from '../state/bookingContext'
import Reveal from './Reveal'

export default function FooterCta() {
  const { openFlow } = useBooking()

  return (
    <section className="fcta">
      <Reveal className="wrap">
        <p className="eyebrow">Reservations</p>
        <h2>
          Your dates are <em>waiting.</em>
        </h2>
        <p>Free cancellation until 7 days before arrival.</p>
        <button type="button" className="btn btn-gold" onClick={() => openFlow()}>
          Check availability
        </button>
      </Reveal>
    </section>
  )
}
