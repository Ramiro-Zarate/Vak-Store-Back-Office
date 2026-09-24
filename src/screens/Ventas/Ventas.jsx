import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useShippingMethods } from '../../hooks/useShippingMethods'
import { useNotice } from '../../hooks/useNotice'
import { cancelManualOrder } from '../../lib/api'
import { buildOrderMetrics } from '../../lib/profit'
import { formatMoney, formatDate } from '../../lib/format'
import { isManualOrder, shippingLabel } from '../../lib/orders'
import { PAYMENT_METHOD_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Modal from '../../components/common/Modal/Modal'
import Notice from '../../components/common/Notice/Notice'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import Spinner from '../../components/common/Spinner/Spinner'
import {
  OrderItemsList,
  OrderMetrics,
  ShippingInfo,
} from '../../components/common/OrderDetail/OrderDetail'
import { OrderStatusBadge } from '../../components/common/StatusBadge/StatusBadge'
import NewSaleForm from './NewSaleForm'
import styles from './Ventas.module.css'

export default function Ventas() {
  const { orders, variants, variantsById, costsByProduct, loading, error, refresh } = useStoreData()
  const { shippingMethods } = useShippingMethods()
  const { notice, notifySuccess, notifyError } = useNotice()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
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
      notifySuccess('Venta cancelada y stock restaurado.')
      setExpandedId(null)
      setCancelTarget(null)
    } catch (err) {
      notifyError(err.message ?? 'Error al cancelar la venta.')
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
      <PageHeader title="Ventas" />

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

      <Notice notice={notice} />

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
            notifySuccess('Venta registrada y stock actualizado.')
          }}
          onError={(message) => notifyError(message ?? 'Error al registrar la venta.')}
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
  const cancelled = order.status === 'cancelled'

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
