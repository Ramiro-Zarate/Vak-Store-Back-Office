import { useEffect, useMemo, useState } from 'react'
import { fetchOrders, fetchVariants, fetchCosts } from '../lib/api'
import { toNumber } from '../lib/format'

export function useStoreData() {
  const [orders, setOrders] = useState([])
  const [variants, setVariants] = useState([])
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [ordersData, variantsData, costsData] = await Promise.all([
          fetchOrders(),
          fetchVariants(),
          fetchCosts(),
        ])
        if (cancelled) return
        setOrders(ordersData)
        setVariants(variantsData)
        setCosts(costsData)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'No se pudieron cargar los datos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const variantsById = useMemo(() => {
    const map = {}
    for (const variant of variants) {
      map[variant.id] = variant
    }
    return map
  }, [variants])

  const costsByProduct = useMemo(() => {
    const map = {}
    for (const cost of costs) {
      map[cost.product_id] = toNumber(cost.cost)
    }
    return map
  }, [costs])

  return {
    orders,
    variants,
    costs,
    variantsById,
    costsByProduct,
    loading,
    error,
    refresh: () => {
      setLoading(true)
      setReloadKey((key) => key + 1)
    },
  }
}
