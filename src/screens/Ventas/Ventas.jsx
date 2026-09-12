import { useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useShippingMethods } from '../../hooks/useShippingMethods'
import { buildOrderMetrics } from '../../lib/profit'
import { formatMoney, formatDate } from '../../lib/format'
import { isManualOrder, shippingLabel } from '../../lib/orders'
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

      <Table columns={['Cliente', 'Pago', 'Estado', 'Total', 'Ganancia', 'Envío', 'Fecha', '']}>
        {manualOrders.map((order) => {
          const metrics = buildOrderMetrics(order, variantsById, costsByProduct)
          return (
            <tr key={order.id}>
              <td>
                <div>{order.customer_name || '—'}</div>
                <div className={styles.sub}>{order.email}</div>
              </td>
              <td>
                <Badge tone="neutral">{PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method ?? '—'}</Badge>
              </td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td>{formatMoney(order.total_amount)}</td>
              <td className={styles.gain}>{formatMoney(metrics.ganancia)}</td>
              <td>
                {shippingLabel(order.shipping_method)}
              </td>
              <td className={styles.muted}>{formatDate(order.created_at)}</td>
              <td className={styles.muted}>{order.id.slice(0, 8)}</td>
            </tr>
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
    </div>
  )
}
