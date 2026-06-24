import { useState, useEffect } from 'react'

// Generalized persisted-state hook (mirrors the existing useState(()=>parse) +
// useEffect(write) pattern used for promotions/refData). Reads once on mount,
// writes on change. `initial` may be a value or a lazy factory.
export function useLocalStorageState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored != null) return JSON.parse(stored)
    } catch {
      /* fall through to initial */
    }
    return typeof initial === 'function' ? initial() : initial
  })

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      /* ignore quota/serialize errors */
    }
  }, [key, value])

  return [value, setValue]
}
