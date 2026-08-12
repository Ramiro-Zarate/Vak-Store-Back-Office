import { useMemo, useState } from 'react'
import { createManualOrder } from '../../lib/api'
import { formatMoney, toNumber } from '../../lib/format'
import { variantLabel } from '../../lib/variant'
import { RETIRA_LOCAL, MOTOMENSAJERIA } from '../../lib/orders'
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../../config/constants'
import styles from './NewSaleForm.module.css'

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100
}

export default function NewSaleForm({ variants, shippingMethods, onClose, onCreated, onError }) {
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [shippingMethod, setShippingMethod] = useState(RETIRA_LOCAL)
  const [shippingCost, setShippingCost] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingPostal, setShippingPostal] = useState('')
  const [province, setProvince] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [orderStatus, setOrderStatus] = useState('paid')

  const [discount, setDiscount] = useState('')

  const [variantQuery, setVariantQuery] = useState('')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const results = useMemo(() => {
    const q = variantQuery.trim().toLowerCase()
    if (!q) return []
    return (variants ?? [])
      .filter((variant) => variantLabel(variant).toLowerCase().includes(q))
      .slice(0, 15)
  }, [variants, variantQuery])

  function addItem(variant) {
    if (items.some((item) => item.product_variant_id === variant.id)) {
      setVariantQuery('')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        product_variant_id: variant.id,
        label: variantLabel(variant),
        unit_price: toNumber(variant.price),
        quantity: 1,
        currentStock: toNumber(variant.stock_quantity),
      },
    ])
    setVariantQuery('')
  }

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((item) => (item.product_variant_id === id ? { ...item, [field]: value } : item)))
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.product_variant_id !== id))
  }

  function selectShippingMethod(value) {
    setShippingMethod(value)
    const method = shippingMethods.find((m) => m.id === value)
    setShippingCost(method ? String(method.base_cost ?? 0) : '')
  }

  const subtotal = items.reduce((acc, item) => acc + toNumber(item.unit_price) * toNumber(item.quantity), 0)
  const discountValue = Math.min(100, Math.max(0, toNumber(discount)))
  const discountAmount = subtotal * (discountValue / 100)
  const shippingCostValue = shippingMethod === RETIRA_LOCAL ? 0 : toNumber(shippingCost)
  const total = subtotal - discountAmount + shippingCostValue

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const validItems = items.filter((item) => toNumber(item.quantity) > 0)
    if (validItems.length === 0) {
      setError('Agregá al menos un item a la venta.')
      return
    }

    const itemsToSave = validItems.map((item) => ({
      ...item,
      unit_price: round2(toNumber(item.unit_price) * (1 - discountValue / 100)),
    }))

    const order = {
      status: orderStatus,
      payment_method: paymentMethod,
      total_amount: round2(total),
      customer_name: customerName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      shipping_address: shippingAddress.trim() || null,
      shipping_city: shippingCity.trim() || null,
      shipping_postal_code: shippingPostal.trim() || null,
      province: province.trim() || null,
      shipping_method: shippingMethod,
      shipping_cost: shippingCostValue,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setSaving(true)
    try {
      await createManualOrder({ order, items: itemsToSave })
      onCreated()
    } catch (err) {
      setError(err.message ?? 'Error al registrar la venta.')
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Cliente</legend>
        <div className={styles.grid3}>
          <div className="field">
            <label className="field-label">Nombre</label>
            <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
          </div>
          <div className="field">
            <label className="field-label">Teléfono</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="opcional" />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Items</legend>

        <div className={styles.picker}>
          <input
            className="input"
            placeholder="Buscar producto, talle, club, liga…"
            value={variantQuery}
            onChange={(e) => setVariantQuery(e.target.value)}
          />
          {variantQuery && (
            <div className={styles.results}>
              {results.length === 0 && <div className={styles.noResults}>Sin resultados</div>}
              {results.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={styles.resultRow}
                  onClick={() => addItem(variant)}
                >
                  <span>{variantLabel(variant)}</span>
                  <span className={styles.resultMeta}>
                    {formatMoney(variant.price)} · stock {toNumber(variant.stock_quantity)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length === 0 && (
          <p className={styles.noItems}>Todavía no hay items cargados.</p>
        )}

        {items.length > 0 && (
          <div className={styles.itemsTable}>
            <div className={styles.itemsHead}>
              <span>Producto</span>
              <span>Cant.</span>
              <span>Precio</span>
              <span></span>
            </div>
            {items.map((item) => (
              <div key={item.product_variant_id} className={styles.itemsRow}>
                <span className={styles.itemLabel}>{item.label}</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={Math.max(1, item.currentStock)}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.product_variant_id, 'quantity', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => updateItem(item.product_variant_id, 'unit_price', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeItem(item.product_variant_id)}
                  aria-label="Quitar item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.discountRow}>
          <div className="field">
            <label className="field-label">Descuento %</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Envío</legend>
        <div className={styles.grid3}>
          <div className="field">
            <label className="field-label">Método</label>
            <select className="select" value={shippingMethod} onChange={(e) => selectShippingMethod(e.target.value)}>
              <option value={RETIRA_LOCAL}>Retiro por local</option>
              <option value={MOTOMENSAJERIA}>Motomensajería</option>
              {shippingMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Costo envío</label>
            <input
              className="input"
              type="number"
              min="0"
              value={shippingCost}
              disabled={shippingMethod === RETIRA_LOCAL}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder={shippingMethod === RETIRA_LOCAL ? '0' : ''}
            />
          </div>
        </div>
        {shippingMethod !== RETIRA_LOCAL && (
          <div className={styles.grid4} style={{ marginTop: 12 }}>
            <div className="field">
              <label className="field-label">Dirección</label>
              <input className="input" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Ciudad</label>
              <input className="input" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Provincia</label>
              <input className="input" value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">CP</label>
              <input className="input" value={shippingPostal} onChange={(e) => setShippingPostal(e.target.value)} />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Pago</legend>
        <div className={styles.grid3}>
          <div className="field">
            <label className="field-label">Método</label>
            <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Estado del pedido</label>
            <select className="select" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        {discountValue > 0 && (
          <div className={styles.summaryRow}><span>Descuento ({discountValue}%)</span><span>−{formatMoney(discountAmount)}</span></div>
        )}
        <div className={styles.summaryRow}><span>Envío</span><span>{formatMoney(shippingCostValue)}</span></div>
        <div className={`${styles.summaryRow} ${styles.total}`}><span>Total</span><span>{formatMoney(total)}</span></div>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>
          {saving ? 'Guardando…' : 'Registrar venta'}
        </button>
      </div>
    </form>
  )
}
