// Brand mark: the 本 ("book") seal next to the store name.
function Wordmark({ className = '', compact = false, style }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} style={style}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center border border-electric/60 font-jp text-[0.95rem] leading-none text-electric"
      >
        本
      </span>
      {!compact && <span className="font-display text-[0.95rem] font-bold tracking-[0.32em]">BOOK STORE</span>}
    </span>
  )
}

export default Wordmark
