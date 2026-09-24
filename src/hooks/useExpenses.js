import { useEffect, useState } from 'react'
import { fetchExpenses } from '../lib/api'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchExpenses()
        if (cancelled) return
        setExpenses(data)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'No se pudieron cargar los gastos.')
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
    expenses,
    loading,
    error,
    refresh: () => {
      setLoading(true)
      setReloadKey((key) => key + 1)
    },
  }
}
