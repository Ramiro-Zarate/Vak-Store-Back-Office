import Badge from '../Badge/Badge'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../../config/constants'
import { normalizeOrderStatus } from '../../../lib/orders'

const orderTone = {
  pending: 'amber',
  awaiting_payment: 'amber',
  await_payment: 'amber',
  paid: 'green',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
}

export function OrderStatusBadge({ status }) {
  const normalized = normalizeOrderStatus(status)
  return (
    <Badge tone={orderTone[normalized] ?? 'neutral'}>
      {ORDER_STATUS_LABELS[normalized] ?? status}
    </Badge>
  )
}

export function PaymentMethodBadge({ method }) {
  return <Badge tone="neutral">{PAYMENT_METHOD_LABELS[method] ?? method ?? '—'}</Badge>
}
