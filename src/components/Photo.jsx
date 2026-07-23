import { useState } from 'react'

/**
 * A photograph that fades in over whatever is behind it.
 *
 * Every photo in this app sits on top of the gradient that used to *be* the
 * artwork, so the gradient is now the placeholder: it shows while the file is
 * in flight and stays put forever if the file never arrives. That is why the
 * image starts at `opacity: 0` rather than being hidden — a failed image
 * degrades to the original design instead of to an empty box.
 *
 * `priority` marks images that are above the fold on every screen size: they
 * are fetched immediately and at high priority. Everything else defers to the
 * browser's own lazy loading.
 */
export default function Photo({
  src,
  srcSet,
  sizes,
  alt = '',
  className = '',
  priority = false,
  kenBurns = false,
}) {
  const [loaded, setLoaded] = useState(false)

  const classes = ['photo']
  if (loaded) classes.push('is-loaded')
  if (kenBurns) classes.push('photo-kb')
  if (className) classes.push(className)

  return (
    <img
      className={classes.join(' ')}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
    />
  )
}
