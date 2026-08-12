import { useEffect, useState } from 'react'
import { fetchProducts } from '../lib/api'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchProducts()
        if (cancelled) return
        setProducts(data)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'No se pudieron cargar los productos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return {
    products,
    loading,
    error,
    refresh: () => {
      setLoading(true)
      setReloadKey((key) => key + 1)
    },
  }
}
