import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'

/** Loads every series in the catalogue (one request shared by both series pages). */
export function useSeries() {
  const [state, setState] = useState({ status: 'loading', series: [] })

  const load = useCallback(async () => {
    try {
      const res = await api.getSeries()
      setState({ status: 'ready', series: res.data.series })
    } catch (error) {
      setState({ status: 'error', series: [], message: error.message })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch
    load()
  }, [load])

  const retry = () => {
    setState({ status: 'loading', series: [] })
    load()
  }

  return { ...state, retry }
}

/**
 * Volume numbers that fall between the lowest and highest stocked volume but
 * aren't in the catalogue, e.g. [2, 3] when only 1 and 4 are stocked.
 */
export function missingVolumes(volumes) {
  const numbers = volumes.map((v) => v.volumeNumber).filter((n) => Number.isInteger(n))
  if (numbers.length < 2) return []
  const have = new Set(numbers)
  const gaps = []
  for (let n = Math.min(...numbers) + 1; n < Math.max(...numbers); n++) if (!have.has(n)) gaps.push(n)
  return gaps
}
