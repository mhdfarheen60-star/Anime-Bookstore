import { useEffect, useRef, useState } from 'react'

/**
 * Debounced search field state. `value` is what callers feed into their data
 * query (updates only after the user pauses), `input` is the controlled input
 * value. The pending timer is cleared on unmount. Pass `initial` to seed the
 * field (e.g. from the URL).
 */
export function useDebouncedSearch(delay = 350, initial = '') {
  const [input, setInput] = useState(initial)
  const [value, setValue] = useState(initial)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onChange = (next) => {
    setInput(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setValue(next), delay)
  }

  const reset = () => {
    clearTimeout(timer.current)
    setInput('')
    setValue('')
  }

  return [input, value, onChange, reset]
}
