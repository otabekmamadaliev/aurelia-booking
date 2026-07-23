import Reveal from './Reveal'

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-art" aria-hidden="true" />
      <div className="wrap hero-grid">
        <Reveal>
          <p className="eyebrow">Boutique Hotel &amp; Spa · Est. 1962</p>
          <h1>
            Where time
            <br />
            <em>slows down.</em>
          </h1>
          <p className="lead">
            A quiet retreat between mountains and pine forest. Nineteen rooms, one
            philosophy — unhurried, considered comfort.
          </p>
          <div className="hero-actions">
            <a className="btn btn-gold" href="#book">
              Check availability
            </a>
            <a className="btn btn-ghost" href="#rooms">
              Explore rooms
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <b>4.9</b>
              <span>Guest rating</span>
            </div>
            <div className="stat">
              <b>19</b>
              <span>Rooms &amp; suites</span>
            </div>
            <div className="stat">
              <b>60y</b>
              <span>Of hospitality</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="visual" delay={0.15}>
          <div className="ph ph-1">
            <span className="ph-label">Panorama King — mountain view</span>
          </div>
          <div className="ph ph-2">
            <span className="ph-label">The spa at dusk</span>
          </div>
          <div className="ph ph-3" aria-hidden="true" />
          <div className="seal">
            <div>
              <b>4.9</b>
              rated by
              <br />
              2,400 guests
            </div>
          </div>
        </Reveal>
      </div>
    </header>
  )
}
