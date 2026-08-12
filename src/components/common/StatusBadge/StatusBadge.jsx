import Badge from '../Badge/Badge'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../../config/constants'

const orderTone = {
  pending: 'amber',
  await_payment: 'amber',
  paid: 'green',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
}

export function OrderStatusBadge({ status }) {
  return (
    <Badge tone={orderTone[status] ?? 'neutral'}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

export function PaymentMethodBadge({ method }) {
  return <Badge tone="neutral">{PAYMENT_METHOD_LABELS[method] ?? method ?? '—'}</Badge>
}
