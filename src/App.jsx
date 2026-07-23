import Amenities from './components/Amenities'
import BookingBar from './components/BookingBar'
import BookingFlow from './components/BookingFlow'
import Footer from './components/Footer'
import FooterCta from './components/FooterCta'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import MyReservations from './components/MyReservations'
import Nav from './components/Nav'
import Rooms from './components/Rooms'
import Testimonial from './components/Testimonial'
import { BookingProvider } from './state/BookingProvider'

export default function App() {
  return (
    <BookingProvider>
      <a className="skip-link" href="#book">
        Skip to booking
      </a>
      <Nav />
      <main>
        <Hero />
        <BookingBar />
        <Rooms />
        <HowItWorks />
        <Amenities />
        <Testimonial />
        <MyReservations />
        <FooterCta />
      </main>
      <Footer />
      <BookingFlow />
    </BookingProvider>
  )
}
