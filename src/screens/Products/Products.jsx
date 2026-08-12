import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useProducts } from '../../hooks/useProducts'
import { upsertCost, updateProductActive } from '../../lib/api'
import { formatMoney, toNumber } from '../../lib/format'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './Products.module.css'

export default function Products() {
  const { costsByProduct, refresh: refreshStore } = useStoreData()
  const { products, loading, error, refresh: refreshProducts } = useProducts()

  const [search, setSearch] = useState('')
  const [costDrafts, setCostDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', text: '' })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => (p.name ?? '').toLowerCase().includes(q))
  }, [products, search])

  async function handleSaveCost(product) {
    const raw = costDrafts[product.id]
    const cost = Math.max(0, toNumber(raw))
    setSavingId(product.id)
    setNotice({ type: '', text: '' })
    try {
      await upsertCost(product.id, cost)
      setCostDrafts((prev) => ({ ...prev, [product.id]: undefined }))
      await refreshStore()
      await refreshProducts()
      setNotice({ type: 'success', text: `Costo de "${product.name}" guardado (${formatMoney(cost)}).` })
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al guardar el costo.' })
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggle(product) {
    setNotice({ type: '', text: '' })
    try {
      await updateProductActive(product.id, !product.is_active)
      await refreshStore()
      await refreshProducts()
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al actualizar.' })
    }
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Productos</h1>

      <Card>
        <input
          className="input"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {notice.text && (
        <div className={`alert ${notice.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {notice.text}
        </div>
      )}

      <Table columns={['Producto', 'Categoría', 'Variantes', 'Stock total', 'Estado', 'Costo (ARS)', '']}>
        {filtered.map((product) => {
          const variants = product.product_variants ?? []
          const totalStock = variants.reduce((acc, v) => acc + toNumber(v.stock_quantity), 0)
          const hasVariants = variants.length > 0
          const currentCost = toNumber(costsByProduct[product.id])
          const draft = costDrafts[product.id]
          const next = draft === undefined ? null : Math.max(0, toNumber(draft))
          const changed = next !== null && next !== currentCost

          return (
            <Fragment key={product.id}>
              <tr>
                <td>
                  <strong>{product.name}</strong>
                  <div className={styles.sub}>
                    {product.is_active ? 'Activo' : 'Inactivo'} · {variants.length} variantes
                  </div>
                </td>
                <td>
                  <Badge tone="neutral">{product.category ?? '—'}</Badge>
                </td>
                <td className={styles.mono}>
                  {hasVariants ? variants.slice(0, 3).map((v) => variantLabel(v)).join(', ') : '—'}
                </td>
                <td>
                  <Badge tone={totalStock === 0 ? 'red' : totalStock < 10 ? 'amber' : 'green'}>
                    {totalStock}
                  </Badge>
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${product.is_active ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => handleToggle(product)}
                  >
                    {product.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
                <td className={styles.costCell}>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder={currentCost > 0 ? String(currentCost) : 'Sin costo'}
                    value={draft === undefined ? '' : draft}
                    onChange={(e) => setCostDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))}
                  />
                </td>
                <td className={styles.actionCell}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!changed || savingId === product.id}
                    onClick={() => handleSaveCost(product)}
                  >
                    {savingId === product.id ? '…' : 'Guardar'}
                  </button>
                </td>
              </tr>
            </Fragment>
          )
        })}
      </Table>
    </div>
  )
}

function variantLabel(variant) {
  const parts = [variant.version, variant.size, variant.club, variant.league].filter(Boolean)
  return parts.join(' · ') || '—'
}
