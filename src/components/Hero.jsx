import Reveal from './Reveal'
import Photo from './Photo'
import heroDetail from '../assets/hero-detail-500.webp'
import heroPanorama700 from '../assets/hero-panorama-700.webp'
import heroPanorama1200 from '../assets/hero-panorama-1200.webp'
import heroSpa500 from '../assets/hero-spa-500.webp'
import heroSpa800 from '../assets/hero-spa-800.webp'

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
            <Photo
              src={heroPanorama1200}
              srcSet={`${heroPanorama700} 700w, ${heroPanorama1200} 1200w`}
              sizes="(max-width: 960px) 70vw, 45vw"
              alt="The Panorama King at sunset, its bed facing a wall of glass over the forested ridge"
              priority
              kenBurns
            />
            <span className="ph-label">Panorama King — mountain view</span>
          </div>
          <div className="ph ph-2">
            <Photo
              src={heroSpa800}
              srcSet={`${heroSpa500} 500w, ${heroSpa800} 800w`}
              sizes="(max-width: 960px) 45vw, 28vw"
              alt="The indoor spa pool, still water reflecting the garden through a wall of windows"
              priority
              kenBurns
            />
            <span className="ph-label">The spa at dusk</span>
          </div>
          <div className="ph ph-3" aria-hidden="true">
            <Photo src={heroDetail} alt="" priority />
          </div>
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
