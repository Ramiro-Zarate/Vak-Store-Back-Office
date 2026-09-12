import { PAID_STATUSES } from '../config/constants'

export const RETIRA_LOCAL = 'retira_local'
export const MOTOMENSAJERIA = 'motomensajeria'

export const SHIPPING_LABELS = {
  [RETIRA_LOCAL]: 'Retiro por local',
  [MOTOMENSAJERIA]: 'Motomensajería',
}

export function shippingLabel(method) {
  return SHIPPING_LABELS[method] ?? method ?? '—'
}

export function normalizeOrderStatus(status) {
  return status === 'await_payment' ? 'awaiting_payment' : status
}

export function isManualOrder(order) {
  return !order.payment_intent_id && !order.bank_info_snapshot && !order.payment_status
}

export function isPaidOrder(order) {
  return PAID_STATUSES.includes(order.status)
}
