export const APP_NAME = 'Vak Store · Back Office'

export const PROFIT_PERCENT = 55
export const MARKETING_PERCENT = 30
export const REINVESTMENT_PERCENT = 15

export const MP_FEE_PERCENT = 0

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export const ORDER_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export const ORDER_STATUS_LABELS = {
  pending: 'Pendiente (MP)',
  awaiting_payment: 'Esperando pago',
  await_payment: 'Esperando pago',
  paid: 'Pagado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const PAID_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

export const PAYMENT_METHOD_LABELS = {
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia',
  cash: 'Efectivo',
}

export const EXPENSE_FUNDS = ['cost', 'marketing', 'profit']

export const EXPENSE_FUND_LABELS = {
  cost: 'Costo / Reinversión',
  marketing: 'Marketing',
  profit: 'Ganancia',
}
