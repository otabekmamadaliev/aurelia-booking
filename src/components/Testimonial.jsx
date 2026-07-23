import Reveal from './Reveal'

export default function Testimonial() {
  return (
    <section>
      <Reveal className="wrap quote">
        <div className="stars" aria-label="Rated five out of five">
          ★ ★ ★ ★ ★
        </div>
        <blockquote>
          "We came for two nights and stayed for five. The booking was the easiest
          I've ever done — and the silence here is something you can't book anywhere
          else."
        </blockquote>
        <cite>— Amelia R., stayed in the Panorama King</cite>
      </Reveal>
    </section>
  )
}
