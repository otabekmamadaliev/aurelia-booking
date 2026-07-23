import { useBooking } from '../state/bookingContext'

export default function Nav() {
  const { openFlow } = useBooking()

  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <a className="logo" href="#top">
          AURE<em>L</em>IA
        </a>
        <div className="nav-links">
          <a href="#rooms">Rooms &amp; Suites</a>
          <a href="#amenities">Amenities</a>
          <a href="#story">Gallery</a>
          <a href="#contact">Contact</a>
          <button type="button" className="nav-book" onClick={() => openFlow()}>
            Book Now
          </button>
        </div>
      </div>
    </nav>
  )
}
