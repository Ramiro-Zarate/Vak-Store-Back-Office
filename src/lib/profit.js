import {
  PROFIT_PERCENT,
  MARKETING_PERCENT,
  REINVESTMENT_PERCENT,
  MP_FEE_PERCENT,
} from '../config/constants'
import { toNumber } from './format'

export function splitProfit(venta, costo, opts = {}) {
  const feePercent = opts.mpFeePercent ?? MP_FEE_PERCENT
  const fee = venta * (feePercent / 100)
  const neto = venta - fee
  const cuenta = neto - costo

  return {
    venta,
    fee,
    neto,
    costo,
    cuenta,
    ganancia: (cuenta * PROFIT_PERCENT) / 100,
    marketing: (cuenta * MARKETING_PERCENT) / 100,
    reinversion: costo + (cuenta * REINVESTMENT_PERCENT) / 100,
  }
}

export function orderRevenueFactor(order) {
  const items = order.order_items ?? []
  const itemsSubtotal = items.reduce(
    (acc, item) => acc + toNumber(item.unit_price) * toNumber(item.quantity),
    0,
  )
  if (itemsSubtotal <= 0) return 1
  const total = toNumber(order.total_amount)
  if (total <= 0) return 1
  const productRevenue = total - toNumber(order.shipping_cost)
  return productRevenue > 0 ? productRevenue / itemsSubtotal : 0
}

function accumulateOrder(order, variantsById, costsByProduct, opts, totals) {
  const factor = orderRevenueFactor(order)

  for (const item of order.order_items ?? []) {
    const variant = variantsById[item.product_variant_id]
    if (!variant) continue

    const cost = toNumber(costsByProduct[variant.product_id])
    const qty = toNumber(item.quantity)
    const split = splitProfit(toNumber(item.unit_price) * qty * factor, cost * qty, opts)

    if (cost <= 0) totals.missingCost += qty

    totals.venta += split.venta
    totals.costo += split.costo
    totals.cuenta += split.cuenta
    totals.ganancia += split.ganancia
    totals.marketing += split.marketing
    totals.reinversion += split.reinversion
    totals.fee += split.fee
    totals.qty += qty
  }

  return totals
}

export function buildOrderMetrics(order, variantsById, costsByProduct, opts = {}) {
  return accumulateOrder(order, variantsById, costsByProduct, opts, emptyTotals())
}

export function buildOrdersMetrics(orders, variantsById, costsByProduct, opts = {}) {
  const totals = emptyTotals()
  for (const order of orders ?? []) {
    accumulateOrder(order, variantsById, costsByProduct, opts, totals)
  }
  return totals
}

export function buildProductReport(orders, variantsById, costsByProduct, opts = {}) {
  const report = new Map()

  for (const order of orders ?? []) {
    const factor = orderRevenueFactor(order)

    for (const item of order.order_items ?? []) {
      const variant = variantsById[item.product_variant_id]
      if (!variant) continue

      const key = variant.product_id
      const entry = report.get(key) ?? {
        product_id: key,
        product_name: variant.products?.name ?? 'Sin nombre',
        category: variant.products?.category ?? '—',
        qty: 0,
        venta: 0,
        costo: 0,
        cuenta: 0,
        ganancia: 0,
        marketing: 0,
        reinversion: 0,
        missingCost: 0,
      }

      const qty = toNumber(item.quantity)
      const unitPrice = toNumber(item.unit_price)
      const cost = toNumber(costsByProduct[variant.product_id])
      const split = splitProfit(unitPrice * qty * factor, cost * qty, opts)

      if (cost <= 0) entry.missingCost += qty

      entry.qty += qty
      entry.venta += split.venta
      entry.costo += split.costo
      entry.cuenta += split.cuenta
      entry.ganancia += split.ganancia
      entry.marketing += split.marketing
      entry.reinversion += split.reinversion

      report.set(key, entry)
    }
  }

  return [...report.values()].sort((a, b) => b.venta - a.venta)
}

export function emptyTotals() {
  return {
    venta: 0,
    costo: 0,
    cuenta: 0,
    ganancia: 0,
    marketing: 0,
    reinversion: 0,
    fee: 0,
    qty: 0,
    missingCost: 0,
  }
}

export const FUND_ASSIGNED_KEY = {
  cost: 'reinversion',
  marketing: 'marketing',
  profit: 'ganancia',
}

export function buildFunds(orders, variantsById, costsByProduct, expenses, opts = {}) {
  const totals = buildOrdersMetrics(orders, variantsById, costsByProduct, opts)

  const funds = {}
  for (const [fund, key] of Object.entries(FUND_ASSIGNED_KEY)) {
    const assigned = totals[key]
    funds[fund] = { fund, assigned, spent: 0, available: assigned }
  }

  for (const expense of expenses ?? []) {
    const entry = funds[expense.fund]
    if (!entry) continue
    entry.spent += toNumber(expense.amount)
  }

  for (const entry of Object.values(funds)) {
    entry.available = entry.assigned - entry.spent
  }

  return { funds, totals }
}
