import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useShippingMethods } from '../../hooks/useShippingMethods'
import { cancelManualOrder } from '../../lib/api'
import { buildOrderMetrics, orderRevenueFactor } from '../../lib/profit'
import { formatMoney, formatDate, toNumber } from '../../lib/format'
import { isManualOrder, shippingLabel } from '../../lib/orders'
import { variantLabel } from '../../lib/variant'
import { PAYMENT_METHOD_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Modal from '../../components/common/Modal/Modal'
import Spinner from '../../components/common/Spinner/Spinner'
import { OrderStatusBadge } from '../../components/common/StatusBadge/StatusBadge'
import NewSaleForm from './NewSaleForm'
import styles from './Ventas.module.css'

export default function Ventas() {
  const { orders, variants, variantsById, costsByProduct, loading, error, refresh } = useStoreData()
  const { shippingMethods } = useShippingMethods()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState({ type: '', text: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const manualOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (orders ?? [])
      .filter(isManualOrder)
      .filter((order) => {
        if (!q) return true
        return [order.customer_name, order.email, order.id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [orders, search])

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelManualOrder(cancelTarget)
      await refresh()
      setNotice({ type: 'success', text: 'Venta cancelada y stock restaurado.' })
      setExpandedId(null)
      setCancelTarget(null)
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al cancelar la venta.' })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Ventas</h1>

      <Card>
        <div className={styles.toolbar}>
          <input
            className="input"
            placeholder="Buscar por cliente, email o ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            + Nueva venta
          </button>
        </div>
        <p className={styles.count}>{manualOrders.length} ventas manuales</p>
      </Card>

      {notice.text && (
        <div className={`alert ${notice.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {notice.text}
        </div>
      )}

      <Table columns={['Cliente', 'Pago', 'Estado', 'Total', 'Ganancia', 'Envío', 'Fecha', 'ID', '']}>
        {manualOrders.map((order) => {
          const metrics = buildOrderMetrics(order, variantsById, costsByProduct)
          const isOpen = expandedId === order.id

          return (
            <Fragment key={order.id}>
              <tr
                className={styles.clickable}
                onClick={() => setExpandedId(isOpen ? null : order.id)}
              >
                <td>
                  <div>{order.customer_name || '—'}</div>
                  <div className={styles.sub}>{order.email}</div>
                </td>
                <td>
                  <Badge tone="neutral">
                    {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method ?? '—'}
                  </Badge>
                </td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td>{formatMoney(order.total_amount)}</td>
                <td className={styles.gain}>{formatMoney(metrics.ganancia)}</td>
                <td>{shippingLabel(order.shipping_method)}</td>
                <td className={styles.muted}>{formatDate(order.created_at)}</td>
                <td className={styles.muted}>{order.id.slice(0, 8)}</td>
                <td className={styles.expandCell}>{isOpen ? '▲' : '▼'}</td>
              </tr>

              {isOpen && (
                <tr className={styles.detailRow}>
                  <td colSpan={9}>
                    <ManualSaleDetail
                      order={order}
                      metrics={metrics}
                      variantsById={variantsById}
                      onCancel={() => setCancelTarget(order)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </Table>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nueva venta">
        <NewSaleForm
          variants={variants}
          shippingMethods={shippingMethods}
          onClose={() => setFormOpen(false)}
          onCreated={async () => {
            await refresh()
            setFormOpen(false)
            setNotice({ type: 'success', text: 'Venta registrada y stock actualizado.' })
          }}
          onError={(message) =>
            setNotice({ type: 'error', text: message ?? 'Error al registrar la venta.' })
          }
        />
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (!cancelling) setCancelTarget(null)
        }}
        title="Cancelar venta"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Volver
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </>
        }
      >
        {cancelTarget && (
          <div className={styles.confirm}>
            <p>
              ¿Cancelar la venta de{' '}
              <strong>{cancelTarget.customer_name || cancelTarget.id.slice(0, 8)}</strong>?
            </p>
            <p className={styles.confirmHint}>
              La venta dejará de contar en ventas y ganancias, y se restaurará el stock de cada item.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ManualSaleDetail({ order, metrics, variantsById, onCancel }) {
  const factor = orderRevenueFactor(order)
  const cancelled = order.status === 'cancelled'

  return (
    <div className={styles.detail}>
      <div className={styles.detailGrid}>
        <div>
          <h4 className={styles.detailTitle}>Items</h4>
          <ul className={styles.items}>
            {(order.order_items ?? []).map((item) => {
              const variant = variantsById[item.product_variant_id]
              const label = variant ? variantLabel(variant) : item.product_variant_id.slice(0, 8)
              const image = variant?.products?.images?.[0]
              return (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemMain}>
                    {image && <img className={styles.itemThumb} src={image} alt="" loading="lazy" />}
                    <span className={styles.itemLabel}>
                      {label} × {item.quantity}
                    </span>
                  </span>
                  <span>
                    {formatMoney(toNumber(item.unit_price) * toNumber(item.quantity) * factor)}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className={styles.metrics}>
            <span>
              Venta: <strong>{formatMoney(metrics.venta)}</strong>
            </span>
            <span>
              Costo: <strong>{formatMoney(metrics.costo)}</strong>
            </span>
            <span>
              Cuenta: <strong>{formatMoney(metrics.cuenta)}</strong>
            </span>
            <span>
              Ganancia: <strong>{formatMoney(metrics.ganancia)}</strong>
            </span>
          </div>
        </div>

        <div>
          <h4 className={styles.detailTitle}>Envío</h4>
          <ul className={styles.shipList}>
            <li>
              <span>Método</span>
              <span>{shippingLabel(order.shipping_method)}</span>
            </li>
            <li>
              <span>Dirección</span>
              <span>{order.shipping_address ?? '—'}</span>
            </li>
            <li>
              <span>Ciudad</span>
              <span>{order.shipping_city ?? '—'}</span>
            </li>
            <li>
              <span>Provincia</span>
              <span>{order.province ?? '—'}</span>
            </li>
            <li>
              <span>Teléfono</span>
              <span>{order.phone ?? '—'}</span>
            </li>
            <li>
              <span>Costo envío</span>
              <span>{formatMoney(order.shipping_cost)}</span>
            </li>
          </ul>
        </div>
      </div>

      {!cancelled && (
        <div className={styles.detailActions}>
          <button type="button" className="btn btn-danger" onClick={onCancel}>
            Cancelar venta
          </button>
        </div>
      )}
    </div>
  )
}
