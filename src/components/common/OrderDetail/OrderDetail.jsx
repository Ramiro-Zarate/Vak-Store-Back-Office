import { formatMoney, toNumber } from '../../../lib/format'
import { orderRevenueFactor } from '../../../lib/profit'
import { variantLabel } from '../../../lib/variant'
import { shippingLabel } from '../../../lib/orders'
import styles from './OrderDetail.module.css'

export function OrderItemsList({ order, variantsById }) {
  const factor = orderRevenueFactor(order)

  return (
    <ul className={styles.items}>
      {(order.order_items ?? []).map((item) => {
        const variant = variantsById[item.product_variant_id]
        const label = variant ? variantLabel(variant) : item.product_variant_id.slice(0, 8)
        const image = variant?.products?.images?.[0]
        return (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemMain}>
              {image && <img className={styles.itemThumb} src={image} alt="" loading="lazy" />}
              <span className={styles.itemLabel}>
                {label} × {item.quantity}
              </span>
            </span>
            <span>{formatMoney(toNumber(item.unit_price) * toNumber(item.quantity) * factor)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function OrderMetrics({ metrics }) {
  return (
    <div className={styles.metrics}>
      <span>
        Venta: <strong>{formatMoney(metrics.venta)}</strong>
      </span>
      <span>
        Costo: <strong>{formatMoney(metrics.costo)}</strong>
      </span>
      <span>
        Cuenta: <strong>{formatMoney(metrics.cuenta)}</strong>
      </span>
      <span>
        Ganancia: <strong>{formatMoney(metrics.ganancia)}</strong>
      </span>
    </div>
  )
}

export function ShippingInfo({ order }) {
  return (
    <ul className={styles.shipList}>
      <li>
        <span>Método</span>
        <span>{shippingLabel(order.shipping_method)}</span>
      </li>
      <li>
        <span>Dirección</span>
        <span>{order.shipping_address ?? '—'}</span>
      </li>
      <li>
        <span>Ciudad</span>
        <span>{order.shipping_city ?? '—'}</span>
      </li>
      <li>
        <span>Provincia</span>
        <span>{order.province ?? '—'}</span>
      </li>
      <li>
        <span>Código postal</span>
        <span>{order.shipping_postal_code ?? '—'}</span>
      </li>
      <li>
        <span>Teléfono</span>
        <span>{order.phone ?? '—'}</span>
      </li>
      <li>
        <span>Costo envío</span>
        <span>{formatMoney(order.shipping_cost)}</span>
      </li>
    </ul>
  )
}
