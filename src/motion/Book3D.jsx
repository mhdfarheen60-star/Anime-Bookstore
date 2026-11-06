/**
 * Presents a real book cover as a CSS 3D object: the untouched cover is the
 * front face, with a plain spine, page block and back board behind it. Purely
 * presentational and CSS-only (see .book3d in motion.css). Pointer rotation comes
 * from the --px/--py variables of an enclosing <ParallaxScene>; outside one, or
 * on touch / reduced motion, it simply rests in a gentle three-quarter pose. If
 * 3D transforms aren't supported, the extra planes are hidden and the cover is
 * shown flat.
 */
function Book3D({ className = '', children }) {
  return (
    <div className={`book3d ${className}`}>
      <div aria-hidden="true" className="book3d-floor" />
      <div className="book3d-body">
        <div aria-hidden="true" className="book3d-back" />
        <div aria-hidden="true" className="book3d-spine" />
        <div aria-hidden="true" className="book3d-pages" />
        <div className="book3d-face">
          {children}
          <div aria-hidden="true" className="book3d-glare" />
        </div>
      </div>
    </div>
  )
}

export default Book3D
