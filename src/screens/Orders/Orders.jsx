import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { updateOrder } from '../../lib/api'
import { formatMoney, formatDate, toNumber } from '../../lib/format'
import { buildOrderItemMetrics } from '../../lib/profit'
import { shippingLabel } from '../../lib/orders'
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Spinner from '../../components/common/Spinner/Spinner'
import {
  OrderStatusBadge,
  PaymentMethodBadge,
} from '../../components/common/StatusBadge/StatusBadge'
import styles from './Orders.module.css'

export default function Orders() {
  const { orders, variantsById, costsByProduct, loading, error, refresh } = useStoreData()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [expandedId, setExpandedId] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', text: '' })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (orders ?? []).filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false
      if (q) {
        const haystack = [
          order.id,
          order.customer_name,
          order.email,
          order.tracking_number,
          order.carrier,
          order.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (fromDate && new Date(order.created_at) < new Date(`${fromDate}T00:00:00`)) return false
      if (toDate && new Date(order.created_at) > new Date(`${toDate}T23:59:59`)) return false
      return true
    })
  }, [orders, search, statusFilter, fromDate, toDate])

  async function handleSave(order, fields) {
    setSavingId(order.id)
    setNotice({ type: '', text: '' })
    try {
      const nextFields = { ...fields }
      if (fields.status === 'shipped' && !order.shipped_at) {
        nextFields.shipped_at = new Date().toISOString()
      }
      await updateOrder(order.id, nextFields)
      await refresh()
      setNotice({ type: 'success', text: `Pedido ${order.id.slice(0, 8)} actualizado.` })
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al guardar.' })
    } finally {
      setSavingId(null)
    }
  }

  async function handleMarkShipped(order) {
    await handleSave(order, {
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    })
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Pedidos</h1>

      <Card>
        <div className={styles.filters}>
          <input
            className="input"
            placeholder="Buscar por cliente, email, ID, tracking…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Estado: todos</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="Desde"
          />
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="Hasta"
          />
        </div>
        <p className={styles.count}>{filtered.length} pedidos</p>
      </Card>

      {notice.text && (
        <div className={`alert ${notice.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {notice.text}
        </div>
      )}

      <Table columns={['Pedido', 'Cliente', 'Estado', 'Método', 'Total', 'Tracking', 'Fecha', '']}>
        {filtered.map((order) => {
          const isOpen = expandedId === order.id
          const metrics = buildOrderItemMetrics(order.order_items, variantsById, costsByProduct)

          return (
            <Fragment key={order.id}>
              <tr key={order.id} onClick={() => setExpandedId(isOpen ? null : order.id)} className={styles.clickable}>
                <td className={styles.mono}>{order.id.slice(0, 8)}</td>
                <td>
                  <div>{order.customer_name || '—'}</div>
                  <div className={styles.sub}>{order.email}</div>
                </td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td>
                  <PaymentMethodBadge method={order.payment_method} />
                </td>
                <td>{formatMoney(order.total_amount)}</td>
                <td>
                  {order.tracking_number ? (
                    <span className={styles.mono}>
                      {order.tracking_number}
                      {order.carrier && <span className={styles.sub}> · {order.carrier}</span>}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={styles.muted}>{formatDate(order.created_at)}</td>
                <td className={styles.expandCell}>{isOpen ? '▲' : '▼'}</td>
              </tr>

              {isOpen && (
                <tr key={`${order.id}-detail`} className={styles.detailRow}>
                  <td colSpan={8}>
                    <OrderDetail
                      order={order}
                      metrics={metrics}
                      saving={savingId === order.id}
                      onSave={handleSave}
                      onMarkShipped={handleMarkShipped}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </Table>
    </div>
  )
}

function OrderDetail({ order, metrics, saving, onSave, onMarkShipped }) {
  const [status, setStatus] = useState(order.status)
  const [carrier, setCarrier] = useState(order.carrier ?? '')
  const [tracking, setTracking] = useState(order.tracking_number ?? '')

  function reset() {
    setStatus(order.status)
    setCarrier(order.carrier ?? '')
    setTracking(order.tracking_number ?? '')
  }

  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div>
          <h4 className={styles.detailTitle}>Items</h4>
          <ul className={styles.items}>
            {(order.order_items ?? []).map((item) => (
              <li key={item.id} className={styles.item}>
                <span>
                  {item.product_variant_id.slice(0, 8)} × {item.quantity}
                </span>
                <span>{formatMoney(toNumber(item.unit_price) * toNumber(item.quantity))}</span>
              </li>
            ))}
          </ul>
          <div className={styles.metrics}>
            <span>Venta: <strong>{formatMoney(metrics.venta)}</strong></span>
            <span>Costo: <strong>{formatMoney(metrics.costo)}</strong></span>
            <span>Cuenta: <strong>{formatMoney(metrics.cuenta)}</strong></span>
            <span>Ganancia: <strong>{formatMoney(metrics.ganancia)}</strong></span>
          </div>
        </div>

        <div>
          <h4 className={styles.detailTitle}>Envío</h4>
          <ul className={styles.shipList}>
            <li><span>Dirección</span><span>{order.shipping_address ?? '—'}</span></li>
            <li><span>Ciudad</span><span>{order.shipping_city ?? '—'}</span></li>
            <li><span>Provincia</span><span>{order.province ?? '—'}</span></li>
            <li><span>Código postal</span><span>{order.shipping_postal_code ?? '—'}</span></li>
            <li><span>Teléfono</span><span>{order.phone ?? '—'}</span></li>
            <li><span>Envío</span><span>{shippingLabel(order.shipping_method)}</span></li>
            <li><span>Costo envío</span><span>{formatMoney(order.shipping_cost)}</span></li>
          </ul>
        </div>
      </div>

      <div className={styles.editGrid}>
        <div className="field">
          <label className="field-label">Estado del pedido</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Transportista</label>
          <input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="ej: Correo Argentino" />
        </div>

        <div className="field">
          <label className="field-label">N° de tracking</label>
          <input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="ej: 1234567890" />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() =>
            onSave(order, {
              status,
              carrier: carrier || null,
              tracking_number: tracking || null,
            })
          }
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {order.status !== 'shipped' && order.status !== 'delivered' && (
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => onMarkShipped(order)}>
            Marcar enviado
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Descartar
        </button>
      </div>
    </div>
  )
}
