import Reveal from './Reveal'

const STEPS = [
  {
    num: 'no. 1',
    title: 'Select dates',
    copy: 'Live availability — unavailable nights are simply crossed out.',
  },
  {
    num: 'no. 2',
    title: 'Choose a room',
    copy: 'Only rooms free for your dates are shown, with the exact total.',
  },
  {
    num: 'no. 3',
    title: 'Guest details',
    copy: 'Name and email. No account, no password, no friction.',
  },
  {
    num: 'no. 4',
    title: 'Confirmation',
    copy: 'Instant email confirmation with your stay summary.',
  },
]

export default function HowItWorks() {
  return (
    <section id="story">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>
              Booked in <em>under a minute.</em>
            </h2>
          </div>
        </Reveal>

        <Reveal className="flow-grid">
          {STEPS.map((step) => (
            <div className="step-card" key={step.num}>
              <span className="num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
