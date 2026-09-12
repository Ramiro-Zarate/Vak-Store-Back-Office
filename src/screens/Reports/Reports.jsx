import { useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { buildOrdersMetrics, buildProductReport, emptyTotals } from '../../lib/profit'
import { formatMoney } from '../../lib/format'
import { isPaidOrder } from '../../lib/orders'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './Reports.module.css'

export default function Reports() {
  const { orders, variantsById, costsByProduct, loading, error } = useStoreData()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const { totals, perProduct } = useMemo(() => {
    if (!orders) return { totals: emptyTotals(), perProduct: [] }

    const base = (orders ?? []).filter((order) => {
      if (!isPaidOrder(order)) return false
      if (paymentMethod && order.payment_method !== paymentMethod) return false
      if (fromDate && new Date(order.created_at) < new Date(`${fromDate}T00:00:00`)) return false
      if (toDate && new Date(order.created_at) > new Date(`${toDate}T23:59:59`)) return false
      return true
    })

    const totals = buildOrdersMetrics(base, variantsById, costsByProduct)
    const perProduct = buildProductReport(base, variantsById, costsByProduct)

    return { totals, perProduct }
  }, [orders, variantsById, costsByProduct, fromDate, toDate, paymentMethod])

  function exportCsv() {
    const header = [
      'Producto',
      'Categoría',
      'Unidades',
      'Venta',
      'Costo',
      'Cuenta',
      'Ganancia 55%',
      'Marketing 30%',
      'Reinversión',
    ]
    const rows = perProduct.map((p) => [
      p.product_name,
      p.category,
      p.qty,
      p.venta.toFixed(2),
      p.costo.toFixed(2),
      p.cuenta.toFixed(2),
      p.ganancia.toFixed(2),
      p.marketing.toFixed(2),
      p.reinversion.toFixed(2),
    ])

    const totalsRow = [
      'TOTALES',
      '',
      totals.qty,
      totals.venta.toFixed(2),
      totals.costo.toFixed(2),
      totals.cuenta.toFixed(2),
      totals.ganancia.toFixed(2),
      totals.marketing.toFixed(2),
      totals.reinversion.toFixed(2),
    ]

    const csv = [header, ...rows, totalsRow]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-vak-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  const summary = [
    { label: 'Ventas', value: formatMoney(totals.venta), sub: `${totals.qty} unidades` },
    { label: 'Costo', value: formatMoney(totals.costo), sub: 'va 100% a reinversión' },
    { label: 'Cuenta (venta − costo)', value: formatMoney(totals.cuenta), sub: 'base del reparto' },
    { label: 'Ganancia', value: formatMoney(totals.ganancia), sub: '55% de la cuenta' },
    { label: 'Marketing', value: formatMoney(totals.marketing), sub: '30% de la cuenta' },
    { label: 'Reinversión', value: formatMoney(totals.reinversion), sub: 'costo + 15% de la cuenta' },
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Reportes</h1>

      <Card>
        <div className={styles.filters}>
          <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Desde" />
          <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="Hasta" />
          <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="">Método de pago: todos</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="transfer">Transferencia</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={perProduct.length === 0}>
            Exportar CSV
          </button>
        </div>
        <p className={styles.note}>Solo se incluyen pedidos cobrados.</p>
        {totals.missingCost > 0 && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>
            {totals.missingCost} unidades vendidas sin costo cargado (se computaron a costo 0).
            Cargalos en la sección Productos.
          </div>
        )}
      </Card>

      <div className={styles.kpis}>
        {summary.map((kpi) => (
          <Card key={kpi.label} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </Card>
        ))}
      </div>

      <Card title={`Por producto (${perProduct.length})`}>
        {perProduct.length === 0 ? (
          <div className="empty">No hay ventas en el período seleccionado.</div>
        ) : (
          <Table
            columns={[
              'Producto',
              'Categoría',
              'Unid.',
              'Venta',
              'Costo',
              'Cuenta',
              'Ganancia',
              'Marketing',
              'Reinversión',
            ]}
          >
            {perProduct.map((p) => (
              <tr key={p.product_id}>
                <td>
                  <strong>{p.product_name}</strong>
                </td>
                <td>
                  <Badge tone="neutral">{p.category}</Badge>
                </td>
                <td>{p.qty}</td>
                <td>{formatMoney(p.venta)}</td>
                <td>{formatMoney(p.costo)}</td>
                <td>{formatMoney(p.cuenta)}</td>
                <td className={styles.highlight}>{formatMoney(p.ganancia)}</td>
                <td>{formatMoney(p.marketing)}</td>
                <td>{formatMoney(p.reinversion)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
