import { useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useExpenses } from '../../hooks/useExpenses'
import { buildOrdersMetrics, buildProductReport, buildFunds, emptyTotals } from '../../lib/profit'
import { formatMoney } from '../../lib/format'
import { isPaidOrder } from '../../lib/orders'
import { EXPENSE_FUNDS, EXPENSE_FUND_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Spinner from '../../components/common/Spinner/Spinner'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import DateRangeFilter from '../../components/common/DateRangeFilter/DateRangeFilter'
import { KpiGrid, KpiCard } from '../../components/common/Kpi/Kpi'
import styles from './Reports.module.css'

export default function Reports() {
  const { orders, variantsById, costsByProduct, loading, error } = useStoreData()
  const { expenses, loading: loadingExpenses, error: expensesError } = useExpenses()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const { totals, perProduct, funds, totalSpent } = useMemo(() => {
    const base = (orders ?? []).filter((order) => {
      if (!isPaidOrder(order)) return false
      if (paymentMethod && order.payment_method !== paymentMethod) return false
      if (fromDate && new Date(order.created_at) < new Date(`${fromDate}T00:00:00`)) return false
      if (toDate && new Date(order.created_at) > new Date(`${toDate}T23:59:59`)) return false
      return true
    })

    const expensesInPeriod = (expenses ?? []).filter((expense) => {
      if (fromDate && new Date(expense.spent_at) < new Date(`${fromDate}T00:00:00`)) return false
      if (toDate && new Date(expense.spent_at) > new Date(`${toDate}T23:59:59`)) return false
      return true
    })

    if (base.length === 0 && expensesInPeriod.length === 0) {
      return { totals: emptyTotals(), perProduct: [], funds: null, totalSpent: 0 }
    }

    const nextTotals = buildOrdersMetrics(base, variantsById, costsByProduct)
    const nextPerProduct = buildProductReport(base, variantsById, costsByProduct)
    const { funds: nextFunds } = buildFunds(base, variantsById, costsByProduct, expensesInPeriod)
    const spent = EXPENSE_FUNDS.reduce((acc, fund) => acc + nextFunds[fund].spent, 0)

    return { totals: nextTotals, perProduct: nextPerProduct, funds: nextFunds, totalSpent: spent }
  }, [orders, expenses, variantsById, costsByProduct, fromDate, toDate, paymentMethod])

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

    const fundHeader = ['Fondo', 'Asignado', 'Gastado', 'Disponible']
    const fundRows = EXPENSE_FUNDS.map((fund) => {
      const entry = funds?.[fund] ?? { assigned: 0, spent: 0, available: 0 }
      return [
        EXPENSE_FUND_LABELS[fund],
        entry.assigned.toFixed(2),
        entry.spent.toFixed(2),
        entry.available.toFixed(2),
      ]
    })

    const csv = [header, ...rows, totalsRow, [], fundHeader, ...fundRows]
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

  if (loading || loadingExpenses) return <Spinner />

  const loadError = error || expensesError
  if (loadError) {
    return <div className="alert alert-error">{loadError}</div>
  }

  const summary = [
    { label: 'Ventas', value: formatMoney(totals.venta), sub: `${totals.qty} unidades` },
    { label: 'Costo', value: formatMoney(totals.costo), sub: 'va 100% a reinversión' },
    { label: 'Cuenta (venta − costo)', value: formatMoney(totals.cuenta), sub: 'base del reparto' },
    { label: 'Ganancia', value: formatMoney(totals.ganancia), sub: '55% de la cuenta' },
    { label: 'Marketing', value: formatMoney(totals.marketing), sub: '30% de la cuenta' },
    { label: 'Reinversión', value: formatMoney(totals.reinversion), sub: 'costo + 15% de la cuenta' },
    { label: 'Gastos del período', value: formatMoney(totalSpent), sub: 'movimientos cargados' },
  ]

  return (
    <div className={styles.page}>
      <PageHeader title="Reportes" />

      <Card>
        <div className={styles.filters}>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
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

      <KpiGrid>
        {summary.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
        ))}
      </KpiGrid>

      {funds && (
        <Card title="Saldos por fondo">
          <Table columns={['Fondo', 'Asignado', 'Gastado', 'Disponible']}>
            {EXPENSE_FUNDS.map((fund) => {
              const entry = funds[fund]
              return (
                <tr key={fund}>
                  <td>
                    <Badge tone="neutral">{EXPENSE_FUND_LABELS[fund]}</Badge>
                  </td>
                  <td>{formatMoney(entry.assigned)}</td>
                  <td>{formatMoney(entry.spent)}</td>
                  <td className={styles.highlight}>{formatMoney(entry.available)}</td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}

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
