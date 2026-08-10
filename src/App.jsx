import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
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

/**
 * The back office is code-split. Guests are the overwhelming majority of
 * traffic and must never pay to download a staff tool they will never open.
 */
const AdminApp = lazy(() => import('./admin/AdminApp'))

function PublicSite() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<p className="admin-loading">Loading back office…</p>}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
