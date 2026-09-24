import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useNotice } from '../../hooks/useNotice'
import { updateOrder } from '../../lib/api'
import { formatMoney, formatDate } from '../../lib/format'
import { buildOrderMetrics } from '../../lib/profit'
import { normalizeOrderStatus } from '../../lib/orders'
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Notice from '../../components/common/Notice/Notice'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import DateRangeFilter from '../../components/common/DateRangeFilter/DateRangeFilter'
import Spinner from '../../components/common/Spinner/Spinner'
import {
  OrderItemsList,
  OrderMetrics,
  ShippingInfo,
} from '../../components/common/OrderDetail/OrderDetail'
import {
  OrderStatusBadge,
  PaymentMethodBadge,
} from '../../components/common/StatusBadge/StatusBadge'
import styles from './Orders.module.css'

export default function Orders() {
  const { orders, variantsById, costsByProduct, loading, error, refresh } = useStoreData()
  const { notice, notifySuccess, notifyError } = useNotice()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [expandedId, setExpandedId] = useState(null)
  const [savingId, setSavingId] = useState(null)

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
    try {
      const nextFields = { ...fields }
      if (fields.status === 'shipped' && !order.shipped_at) {
        nextFields.shipped_at = new Date().toISOString()
      }
      await updateOrder(order.id, nextFields)
      await refresh()
      notifySuccess(`Pedido ${order.id.slice(0, 8)} actualizado.`)
    } catch (err) {
      notifyError(err.message ?? 'Error al guardar.')
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
      <PageHeader title="Pedidos" />

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
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        </div>
        <p className={styles.count}>{filtered.length} pedidos</p>
      </Card>

      <Notice notice={notice} />

      <Table columns={['Pedido', 'Cliente', 'Estado', 'Método', 'Total', 'Tracking', 'Fecha', '']}>
        {filtered.map((order) => {
          const isOpen = expandedId === order.id
          const metrics = buildOrderMetrics(order, variantsById, costsByProduct)

          return (
            <Fragment key={order.id}>
              <tr onClick={() => setExpandedId(isOpen ? null : order.id)} className={styles.clickable}>
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
                <tr className={styles.detailRow}>
                  <td colSpan={8}>
                    <OrderDetail
                      order={order}
                      metrics={metrics}
                      variantsById={variantsById}
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

function OrderDetail({ order, metrics, variantsById, saving, onSave, onMarkShipped }) {
  const [status, setStatus] = useState(normalizeOrderStatus(order.status))
  const [carrier, setCarrier] = useState(order.carrier ?? '')
  const [tracking, setTracking] = useState(order.tracking_number ?? '')

  function reset() {
    setStatus(normalizeOrderStatus(order.status))
    setCarrier(order.carrier ?? '')
    setTracking(order.tracking_number ?? '')
  }

  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div>
          <h4 className={styles.detailTitle}>Items</h4>
          <OrderItemsList order={order} variantsById={variantsById} />
          <OrderMetrics metrics={metrics} />
        </div>

        <div>
          <h4 className={styles.detailTitle}>Envío</h4>
          <ShippingInfo order={order} />
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
