import { useEffect, useState } from 'react'
import { fetchShippingMethods } from '../lib/api'

export function useShippingMethods() {
  const [shippingMethods, setShippingMethods] = useState([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchShippingMethods()
        if (!cancelled) setShippingMethods(data)
      } catch {
        if (!cancelled) setShippingMethods([])
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { shippingMethods, refresh: () => setReloadKey((key) => key + 1) }
}
