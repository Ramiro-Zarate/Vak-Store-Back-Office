import { useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useExpenses } from '../../hooks/useExpenses'
import { useNotice } from '../../hooks/useNotice'
import { deleteExpense } from '../../lib/api'
import { buildFunds } from '../../lib/profit'
import { isPaidOrder } from '../../lib/orders'
import { formatMoney, formatDateOnly, toNumber } from '../../lib/format'
import { EXPENSE_FUNDS, EXPENSE_FUND_LABELS } from '../../config/constants'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Modal from '../../components/common/Modal/Modal'
import Notice from '../../components/common/Notice/Notice'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import DateRangeFilter from '../../components/common/DateRangeFilter/DateRangeFilter'
import Spinner from '../../components/common/Spinner/Spinner'
import { KpiGrid, KpiCard } from '../../components/common/Kpi/Kpi'
import ExpenseForm from './ExpenseForm'
import styles from './Finanzas.module.css'

const fundTone = { cost: 'blue', marketing: 'amber', profit: 'green' }

export default function Finanzas() {
  const { orders, variantsById, costsByProduct, loading, error } = useStoreData()
  const { expenses, loading: loadingExpenses, error: expensesError, refresh } = useExpenses()
  const { notice, notifySuccess, notifyError } = useNotice()

  const [search, setSearch] = useState('')
  const [fundFilter, setFundFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formDefaults, setFormDefaults] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { funds } = useMemo(
    () =>
      buildFunds(
        (orders ?? []).filter(isPaidOrder),
        variantsById,
        costsByProduct,
        expenses,
      ),
    [orders, variantsById, costsByProduct, expenses],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (expenses ?? []).filter((expense) => {
      if (fundFilter && expense.fund !== fundFilter) return false
      if (q) {
        const haystack = [expense.concept, expense.category].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (fromDate && new Date(expense.spent_at) < new Date(`${fromDate}T00:00:00`)) return false
      if (toDate && new Date(expense.spent_at) > new Date(`${toDate}T23:59:59`)) return false
      return true
    })
  }, [expenses, search, fundFilter, fromDate, toDate])

  const totalSpent = EXPENSE_FUNDS.reduce((acc, fund) => acc + funds[fund].spent, 0)
  const totalAvailable = EXPENSE_FUNDS.reduce((acc, fund) => acc + funds[fund].available, 0)

  function openNew() {
    setEditTarget(null)
    setFormDefaults(null)
    setFormOpen(true)
  }

  function openWithdraw() {
    setEditTarget(null)
    setFormDefaults({
      fund: 'profit',
      concept: 'Retiro de ganancia',
      amount: funds.profit.available > 0 ? funds.profit.available : '',
    })
    setFormOpen(true)
  }

  function openEdit(expense) {
    setFormDefaults(null)
    setEditTarget(expense)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTarget(null)
    setFormDefaults(null)
  }

  async function handleSaved(action) {
    closeForm()
    await refresh()
    notifySuccess(`Movimiento ${action}.`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExpense(deleteTarget.id)
      await refresh()
      notifySuccess('Movimiento eliminado.')
      setDeleteTarget(null)
    } catch (err) {
      notifyError(err.message ?? 'Error al eliminar el movimiento.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || loadingExpenses) return <Spinner />

  const loadError = error || expensesError
  if (loadError) {
    return <div className="alert alert-error">{loadError}</div>
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Finanzas"
        subtitle="Plata disponible por fondo y movimientos de gastos y retiros"
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={openWithdraw}
              disabled={funds.profit.available <= 0}
            >
              Retirar ganancia
            </button>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              + Anotar movimiento
            </button>
          </>
        }
      />

      <KpiGrid>
        {EXPENSE_FUNDS.map((fund) => {
          const entry = funds[fund]
          return (
            <KpiCard
              key={fund}
              tone={fundTone[fund]}
              label={EXPENSE_FUND_LABELS[fund]}
              value={formatMoney(entry.available)}
              sub={`Asignado ${formatMoney(entry.assigned)} · Gastado ${formatMoney(entry.spent)}`}
            />
          )
        })}
        <KpiCard
          label="Total"
          value={formatMoney(totalAvailable)}
          sub={`Disponible · Gastado ${formatMoney(totalSpent)}`}
        />
      </KpiGrid>

      <Notice notice={notice} />

      <Card>
        <div className={styles.filters}>
          <input
            className="input"
            placeholder="Buscar por concepto o categoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select"
            value={fundFilter}
            onChange={(e) => setFundFilter(e.target.value)}
          >
            <option value="">Fondo: todos</option>
            {EXPENSE_FUNDS.map((fund) => (
              <option key={fund} value={fund}>
                {EXPENSE_FUND_LABELS[fund]}
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
        <p className={styles.count}>{filtered.length} movimientos</p>
      </Card>

      <Card title="Movimientos">
        {filtered.length === 0 ? (
          <div className="empty">No hay movimientos cargados.</div>
        ) : (
          <Table columns={['Fecha', 'Concepto', 'Categoría', 'Fondo', 'Monto', '']}>
            {filtered.map((expense) => (
              <tr key={expense.id}>
                <td className={styles.muted}>{formatDateOnly(expense.spent_at)}</td>
                <td>
                  <strong>{expense.concept}</strong>
                  {expense.notes && <div className={styles.sub}>{expense.notes}</div>}
                </td>
                <td>
                  {expense.category ? (
                    <Badge tone="neutral">{expense.category}</Badge>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td>
                  <Badge tone={fundTone[expense.fund] ?? 'neutral'}>
                    {EXPENSE_FUND_LABELS[expense.fund] ?? expense.fund}
                  </Badge>
                </td>
                <td className={styles.amount}>−{formatMoney(toNumber(expense.amount))}</td>
                <td className={styles.actionsCell}>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(expense)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeleteTarget(expense)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editTarget ? 'Editar movimiento' : 'Anotar movimiento'}
      >
        <ExpenseForm
          expense={editTarget}
          defaults={formDefaults}
          onClose={closeForm}
          onSaved={handleSaved}
          onError={(message) => notifyError(message ?? 'Error al guardar.')}
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        title="Eliminar movimiento"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Volver
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className={styles.confirm}>
            <p>
              ¿Eliminar <strong>{deleteTarget.concept}</strong> por{' '}
              {formatMoney(deleteTarget.amount)}?
            </p>
            <p className={styles.confirmHint}>
              Se devuelve el monto al fondo {EXPENSE_FUND_LABELS[deleteTarget.fund] ?? deleteTarget.fund}.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
