import Photo from './Photo'
import Reveal from './Reveal'
import amenityDining from '../assets/amenity-dining-600.webp'
import amenityPool from '../assets/amenity-pool-600.webp'
import amenitySpa from '../assets/amenity-spa-600.webp'
import amenityTrails from '../assets/amenity-trails-600.webp'

/**
 * The photographs here are texture, not documentation: each sits under a heavy
 * forest-green wash so the band still reads as the solid dark block from the
 * approved design, and every icon and caption keeps its contrast. That is also
 * why they are marked decorative — the heading above each one already says what
 * it is, so announcing the image again would only add noise for screen readers.
 */
const AMENITIES = [
  {
    icon: '✦',
    title: 'Forest Spa',
    copy: 'Sauna, steam and cold plunge under the pines.',
    image: amenitySpa,
  },
  {
    icon: '◌',
    title: 'Heated Pool',
    copy: 'Open year-round, warmest at sunrise.',
    image: amenityPool,
  },
  {
    icon: '❖',
    title: 'Restaurant',
    copy: 'Seasonal menu from farms within 30 km.',
    image: amenityDining,
  },
  {
    icon: '↟',
    title: 'Trails & Bikes',
    copy: 'Guided ridge walks and mountain bikes, on the house.',
    image: amenityTrails,
  },
]

export default function Amenities() {
  return (
    <section className="amen" id="amenities">
      <div className="wrap">
        <Reveal>
          <p className="eyebrow">Amenities</p>
          <h2>
            Everything you need, <em>nothing you don't.</em>
          </h2>
        </Reveal>

        <Reveal className="amen-grid">
          {AMENITIES.map((item) => (
            <div className="amen-cell" key={item.title}>
              <Photo src={item.image} alt="" className="amen-photo" />
              <div className="amen-body">
                <span className="ic" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
