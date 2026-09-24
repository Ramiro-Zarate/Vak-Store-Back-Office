import { useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useNotice } from '../../hooks/useNotice'
import { updateVariantStock } from '../../lib/api'
import { formatMoney, toNumber } from '../../lib/format'
import { variantLabel } from '../../lib/variant'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Notice from '../../components/common/Notice/Notice'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './Stock.module.css'

export default function Stock() {
  const { variants, costsByProduct, loading, error, refresh } = useStoreData()
  const { notice, notifySuccess, notifyError, clear } = useNotice()
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = (variants ?? []).map((variant) => ({
      variant,
      label: variantLabel(variant),
      hasCost: toNumber(costsByProduct[variant.product_id]) > 0,
    }))
    return q
      ? rows.filter((row) => row.label.toLowerCase().includes(q))
      : rows
  }, [variants, search, costsByProduct])

  function setEdit(id, value) {
    setEdits((prev) => ({ ...prev, [id]: value }))
  }

  async function handleSave(variant) {
    const raw = edits[variant.id] ?? variant.stock_quantity
    const qty = Math.max(0, Math.round(toNumber(raw)))
    setSavingId(variant.id)
    clear()
    try {
      await updateVariantStock(variant.id, qty)
      setEdits((prev) => ({ ...prev, [variant.id]: undefined }))
      await refresh()
      notifySuccess(`Stock de "${variantLabel(variant)}" actualizado a ${qty}.`)
    } catch (err) {
      notifyError(err.message ?? 'Error al guardar.')
    } finally {
      setSavingId(null)
    }
  }

  async function handleBulkLoad() {
    clear()
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const results = []
    let updated = 0

    for (const line of lines) {
      const [labelRaw, qtyRaw] = line.split(/[;,]/, 2).map((s) => s.trim())
      if (!labelRaw || !qtyRaw) {
        results.push({ ok: false, line, msg: 'formato inválido (falta cantidad)' })
        continue
      }
      const qty = Math.max(0, Math.round(toNumber(qtyRaw)))
      const tokens = labelRaw.toLowerCase().split(/\s+/).filter(Boolean)

      const matches = (variants ?? []).filter((variant) => {
        const label = variantLabel(variant).toLowerCase()
        return tokens.every((token) => label.includes(token))
      })

      if (matches.length === 0) {
        results.push({ ok: false, line, msg: 'sin coincidencias' })
      } else if (matches.length > 1) {
        results.push({ ok: false, line, msg: `${matches.length} coincidencias ambiguas` })
      } else {
        await updateVariantStock(matches[0].id, qty)
        updated += 1
        results.push({ ok: true, line, msg: `ok → ${qty}` })
      }
    }

    await refresh()
    setBulkOpen(false)
    setBulkText('')
    const summary = `${updated} actualizados de ${lines.length}. ${results.filter((r) => !r.ok).length} con error.`
    if (updated > 0) notifySuccess(summary)
    else notifyError(summary)
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Stock" />

      <Card>
        <div className={styles.toolbar}>
          <input
            className="input"
            placeholder="Buscar producto, talle, club, liga…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => setBulkOpen(!bulkOpen)}>
            {bulkOpen ? 'Cerrar carga masiva' : 'Carga masiva'}
          </button>
        </div>
        <p className={styles.count}>{filtered.length} variantes</p>
      </Card>

      {bulkOpen && (
        <Card title="Carga masiva de stock">
          <p className={styles.bulkHint}>
            Una línea por variante, formato <strong>descripción;cantidad</strong>. La descripción se
            busca en nombre + talle + club + liga (ej: <em>barcelona messi;25</em>). Las líneas que no
            matcheen se ignoran.
          </p>
          <textarea
            className="textarea"
            rows={6}
            placeholder={'barcelona messi;25\nriver plate;10\nnueva camiseta talle M;5'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className={styles.toolbar}>
            <button type="button" className="btn btn-primary" onClick={handleBulkLoad} disabled={!bulkText.trim()}>
              Aplicar carga
            </button>
          </div>
        </Card>
      )}

      <Notice notice={notice} />

      <Table columns={['Producto', 'Variante', 'Precio', 'Stock actual', 'Nuevo stock', 'Costo cargado', '']}>
        {filtered.map(({ variant, hasCost }) => {
          const current = toNumber(variant.stock_quantity)
          const draft = edits[variant.id]
          const next = draft === undefined ? null : Math.max(0, Math.round(toNumber(draft)))
          const changed = next !== null && next !== current

          return (
            <tr key={variant.id}>
              <td>{variant.products?.name ?? '—'}</td>
              <td className={styles.mono}>{variantLabel(variant)}</td>
              <td>{formatMoney(variant.price)}</td>
              <td>
                <Badge tone={current === 0 ? 'red' : current < 5 ? 'amber' : 'green'}>
                  {current}
                </Badge>
              </td>
              <td className={styles.stockCell}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={draft === undefined ? '' : draft}
                  placeholder={String(current)}
                  onChange={(e) => setEdit(variant.id, e.target.value)}
                />
              </td>
              <td>{hasCost ? formatMoney(costsByProduct[variant.product_id]) : <Badge tone="red">Sin costo</Badge>}</td>
              <td className={styles.actionCell}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!changed || savingId === variant.id}
                  onClick={() => handleSave(variant)}
                >
                  {savingId === variant.id ? '…' : 'Guardar'}
                </button>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
