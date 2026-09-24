import { useState } from 'react'
import { useAuth } from '../../context/auth'
import { createExpense, updateExpense } from '../../lib/api'
import { toNumber } from '../../lib/format'
import { EXPENSE_FUNDS, EXPENSE_FUND_LABELS } from '../../config/constants'
import styles from './ExpenseForm.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseForm({ expense, defaults, onClose, onSaved, onError }) {
  const { user } = useAuth()
  const [concept, setConcept] = useState(expense?.concept ?? defaults?.concept ?? '')
  const [category, setCategory] = useState(expense?.category ?? defaults?.category ?? '')
  const [fund, setFund] = useState(expense?.fund ?? defaults?.fund ?? 'cost')
  const [amount, setAmount] = useState(expense?.amount ?? defaults?.amount ?? '')
  const [spentAt, setSpentAt] = useState(expense?.spent_at?.slice(0, 10) ?? today())
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const cleanConcept = concept.trim()
    const value = toNumber(amount)

    if (!cleanConcept) {
      setError('El concepto es obligatorio.')
      return
    }
    if (!(value > 0)) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    setSaving(true)
    setError('')

    const fields = {
      concept: cleanConcept,
      category: category.trim(),
      fund,
      amount: value,
      spent_at: spentAt,
      notes: notes.trim() || null,
    }

    try {
      if (expense) {
        await updateExpense(expense.id, fields)
      } else {
        await createExpense({ ...fields, created_by_email: user?.email ?? null })
      }
      onSaved(expense ? 'actualizado' : 'registrado')
    } catch (err) {
      setError(err.message ?? 'Error al guardar el movimiento.')
      onError?.(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label className="field-label" htmlFor="expenseConcept">Concepto *</label>
        <input
          id="expenseConcept"
          className="input"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Ej. Bolsas de ecommerce"
        />
      </div>

      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="expenseCategory">Categoría</label>
          <input
            id="expenseCategory"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej. Packaging, Publicidad…"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="expenseFund">Fondo de origen *</label>
          <select
            id="expenseFund"
            className="select"
            value={fund}
            onChange={(e) => setFund(e.target.value)}
          >
            {EXPENSE_FUNDS.map((f) => (
              <option key={f} value={f}>
                {EXPENSE_FUND_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="expenseAmount">Monto (ARS) *</label>
          <input
            id="expenseAmount"
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="expenseDate">Fecha</label>
          <input
            id="expenseDate"
            className="input"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="expenseNotes">Notas</label>
        <textarea
          id="expenseNotes"
          className="textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : expense ? 'Guardar cambios' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  )
}
