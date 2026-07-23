import Reveal from './Reveal'

const AMENITIES = [
  { icon: '✦', title: 'Forest Spa', copy: 'Sauna, steam and cold plunge under the pines.' },
  { icon: '◌', title: 'Heated Pool', copy: 'Open year-round, warmest at sunrise.' },
  { icon: '❖', title: 'Restaurant', copy: 'Seasonal menu from farms within 30 km.' },
  {
    icon: '↟',
    title: 'Trails & Bikes',
    copy: 'Guided ridge walks and mountain bikes, on the house.',
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
              <span className="ic" aria-hidden="true">
                {item.icon}
              </span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
