const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

export function formatMoney(value) {
  const num = Number(value)
  return Number.isFinite(num) ? currency.format(num) : '—'
}

export function formatNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? number.format(num) : '—'
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function formatDateOnly(value) {
  if (!value) return '—'
  const [y, m, d] = String(value).slice(0, 10).split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y.slice(2)}`
}

export function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
