import { Children } from 'react'
import { useInView } from './hooks'

/**
 * Fades/slides its content in once it scrolls into view.
 * variant: 'up' | 'fade' | 'scale' | 'center' (opens from the middle) | 'expand'
 */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      className={`${className} ${inView ? 'is-visible' : ''}`}
      style={{ ...style, '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** A wide image or band that opens from its centre line outwards (Scenario 03-C). */
export function ImageReveal(props) {
  return <Reveal variant="center" {...props} />
}

/**
 * Reveals each child one after another. Children are wrapped in `itemAs`
 * elements, so use itemAs="li" inside lists.
 */
export function StaggeredReveal({
  as: Tag = 'div',
  itemAs: Item = 'div',
  itemClassName = '',
  variant = 'up',
  step = 70,
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const [ref, inView] = useInView()
  return (
    <Tag ref={ref} className={className} {...rest}>
      {Children.toArray(children).map((child, i) => (
        <Item
          key={child.key ?? i}
          data-reveal={variant}
          className={`${itemClassName} ${inView ? 'is-visible' : ''}`}
          style={{ '--reveal-delay': `${delay + i * step}ms` }}
        >
          {child}
        </Item>
      ))}
    </Tag>
  )
}

/**
 * Headline whose lines slide up from behind a mask.
 * `arrive` plays the reveal on mount (hero) instead of on scroll.
 */
export function TextReveal({ as: Tag = 'h2', lines, arrive = false, delay = 0, className = '', lineClassName = '', style, ...rest }) {
  const [ref, inView] = useInView()
  let state = ''
  if (arrive) state = 'arrive-line'
  else if (inView) state = 'is-visible'
  return (
    <Tag ref={arrive ? undefined : ref} className={`${className} ${state}`} style={{ ...style, '--reveal-delay': `${delay}ms` }} {...rest}>
      {lines.map((line, i) => (
        <span key={i} className={`tr-line ${lineClassName}`}>
          <span className="tr-inner" style={{ '--i': i }}>{line}</span>
        </span>
      ))}
    </Tag>
  )
}
