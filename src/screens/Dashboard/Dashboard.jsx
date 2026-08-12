import { useMemo } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { buildOrderItemMetrics } from '../../lib/profit'
import { formatMoney, formatDateShort } from '../../lib/format'
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '../../config/constants'
import { isPaidOrder } from '../../lib/orders'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Spinner from '../../components/common/Spinner/Spinner'
import { OrderStatusBadge } from '../../components/common/StatusBadge/StatusBadge'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { orders, variantsById, costsByProduct, loading, error } = useStoreData()

  const summary = useMemo(() => {
    const validOrders = (orders ?? []).filter(isPaidOrder)

    const totals = buildOrderItemMetrics(
      validOrders.flatMap((o) => o.order_items ?? []),
      variantsById,
      costsByProduct,
    )

    const byStatus = {}
    for (const status of ORDER_STATUSES) byStatus[status] = 0
    for (const order of orders ?? []) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1
    }

    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      last7.push({ date, label: formatDateShort(date), total: 0, count: 0 })
    }

    for (const order of validOrders) {
      const dayIndex = last7.findIndex(
        (d) => new Date(order.created_at).toDateString() === d.date.toDateString(),
      )
      if (dayIndex !== -1) {
        last7[dayIndex].total += Number(order.total_amount ?? 0)
        last7[dayIndex].count += 1
      }
    }

    const maxTotal = Math.max(...last7.map((d) => d.total), 1)

    return {
      orderCount: validOrders.length,
      revenue: validOrders.reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0),
      totals,
      byStatus,
      last7,
      maxTotal,
    }
  }, [orders, variantsById, costsByProduct])

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  const { orderCount, revenue, totals, byStatus, last7, maxTotal } = summary
  const kpis = [
    { label: 'Ventas cobradas', value: formatMoney(revenue), sub: `${orderCount} pedidos` },
    { label: 'Ganancia (55%)', value: formatMoney(totals.ganancia), sub: 'de la cuenta venta − costo' },
    { label: 'Marketing (30%)', value: formatMoney(totals.marketing), sub: 'de la cuenta venta − costo' },
    { label: 'Reinversión', value: formatMoney(totals.reinversion), sub: `costo + 15% de la cuenta` },
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>

      <div className={styles.kpis}>
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </Card>
        ))}
      </div>

      <div className={styles.grid}>
        <Card title="Ventas últimos 7 días">
          <div className={styles.chart}>
            {last7.map((day, i) => (
              <div key={i} className={styles.barCol}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(day.total / maxTotal) * 100}%` }}
                    title={`${day.label}: ${formatMoney(day.total)}`}
                  />
                </div>
                <span className={styles.barLabel}>{day.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.chartHint}>
            Solo pedidos cobrados: {formatMoney(revenue)}
          </p>
        </Card>

        <Card title="Pedidos por estado">
          <div className={styles.statusList}>
            {ORDER_STATUSES.map((status) => (
              <div key={status} className={styles.statusRow}>
                <span>{ORDER_STATUS_LABELS[status]}</span>
                <Badge tone={byStatus[status] > 0 ? 'blue' : 'neutral'}>{byStatus[status]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Últimos pedidos">
        <Table columns={['Pedido', 'Cliente', 'Estado', 'Total', 'Fecha']}>
          {(orders ?? []).slice(0, 8).map((order) => (
            <tr key={order.id}>
              <td className={styles.mono}>{order.id.slice(0, 8)}</td>
              <td>{order.customer_name || order.email || '—'}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td>{formatMoney(order.total_amount)}</td>
              <td>{formatDateShort(order.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
