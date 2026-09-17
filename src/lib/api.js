import { supabase } from '../supabaseClient'

const ORDERS_SELECT = `
  *,
  order_items (*)
`

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDERS_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateOrder(id, fields) {
  const { data, error } = await supabase
    .from('orders')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants (*)')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchVariants() {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, products (name, category, images)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateVariantStock(variantId, stockQuantity) {
  const { data, error } = await supabase
    .from('product_variants')
    .update({ stock_quantity: stockQuantity, updated_at: new Date().toISOString() })
    .eq('id', variantId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProductActive(productId, isActive) {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createProduct({ name, category, description, is_active }) {
  const { data, error } = await supabase
    .from('products')
    .insert({ name, category, description, is_active })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createVariant({ product_id, version, size, club, league, price, stock_quantity }) {
  const { data, error } = await supabase
    .from('product_variants')
    .insert({ product_id, version, size, club, league, price, stock_quantity })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchCosts() {
  const { data, error } = await supabase.from('product_costs').select('*')

  if (error) throw error
  return data ?? []
}

export async function upsertCost(productId, cost) {
  const { data, error } = await supabase
    .from('product_costs')
    .upsert({ product_id: productId, cost, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchShippingMethods() {
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function cancelManualOrder(order) {
  const { data: current, error: readError } = await supabase
    .from('orders')
    .select('status, order_items (product_variant_id, quantity)')
    .eq('id', order.id)
    .single()

  if (readError) throw readError
  if (current.status === 'cancelled') return current

  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  if (orderError) throw orderError

  for (const item of current.order_items ?? []) {
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', item.product_variant_id)
      .single()

    if (variantError) throw variantError

    const nextStock = Number(variant?.stock_quantity ?? 0) + Number(item.quantity ?? 0)
    const { error: stockError } = await supabase
      .from('product_variants')
      .update({ stock_quantity: nextStock, updated_at: new Date().toISOString() })
      .eq('id', item.product_variant_id)

    if (stockError) throw stockError
  }
}

export async function createManualOrder({ order, items }) {
  const { data: createdOrder, error: orderError } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()

  if (orderError) throw orderError

  const rows = items.map((item) => ({
    order_id: createdOrder.id,
    product_variant_id: item.product_variant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(rows)
  if (itemsError) throw itemsError

  for (const item of items) {
    const nextStock = Math.max(0, item.currentStock - item.quantity)
    const { error: stockError } = await supabase
      .from('product_variants')
      .update({ stock_quantity: nextStock, updated_at: new Date().toISOString() })
      .eq('id', item.product_variant_id)

    if (stockError) throw stockError
  }

  return createdOrder
}
