import { motion, useReducedMotion } from 'framer-motion'

/**
 * A one-shot fade-and-rise as a block scrolls into view.
 *
 * When the OS asks for reduced motion `initial` is `false`, which tells Framer
 * Motion to render the element in its final state and skip the animation
 * altogether — not merely to shorten it.
 */
export default function Reveal({ children, delay = 0, className, as: Tag = 'div' }) {
  const reduceMotion = useReducedMotion()
  const MotionTag = motion[Tag]

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  )
}
