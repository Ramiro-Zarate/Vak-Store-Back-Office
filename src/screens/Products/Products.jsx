import { Fragment, useMemo, useState } from 'react'
import { useStoreData } from '../../hooks/useStoreData'
import { useProducts } from '../../hooks/useProducts'
import { upsertCost, updateProductActive, createProduct, createVariant } from '../../lib/api'
import { formatMoney, toNumber } from '../../lib/format'
import Card from '../../components/common/Card/Card'
import Table from '../../components/common/Table/Table'
import Badge from '../../components/common/Badge/Badge'
import Modal from '../../components/common/Modal/Modal'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './Products.module.css'

const emptyProduct = { name: '', category: 'camiseta', description: '', is_active: true }
const emptyVariant = { version: '', size: '', club: '', league: '', price: '', stock_quantity: 0 }

export default function Products() {
  const { costsByProduct, refresh: refreshStore } = useStoreData()
  const { products, loading, error, refresh: refreshProducts } = useProducts()

  const [search, setSearch] = useState('')
  const [costDrafts, setCostDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', text: '' })

  const [productOpen, setProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState(emptyProduct)
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState('')

  const [variantProduct, setVariantProduct] = useState(null)
  const [newVariant, setNewVariant] = useState(emptyVariant)
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantError, setVariantError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => (p.name ?? '').toLowerCase().includes(q))
  }, [products, search])

  async function handleSaveCost(product) {
    const raw = costDrafts[product.id]
    const cost = Math.max(0, toNumber(raw))
    setSavingId(product.id)
    setNotice({ type: '', text: '' })
    try {
      await upsertCost(product.id, cost)
      setCostDrafts((prev) => ({ ...prev, [product.id]: undefined }))
      await refreshStore()
      await refreshProducts()
      setNotice({ type: 'success', text: `Costo de "${product.name}" guardado (${formatMoney(cost)}).` })
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al guardar el costo.' })
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggle(product) {
    setNotice({ type: '', text: '' })
    try {
      await updateProductActive(product.id, !product.is_active)
      await refreshStore()
      await refreshProducts()
    } catch (err) {
      setNotice({ type: 'error', text: err.message ?? 'Error al actualizar.' })
    }
  }

  function openNewProduct() {
    setNewProduct(emptyProduct)
    setProductError('')
    setProductOpen(true)
  }

  async function handleCreateProduct(e) {
    e.preventDefault()
    const name = newProduct.name.trim()
    const category = newProduct.category.trim() || 'camiseta'
    if (!name) {
      setProductError('El nombre es obligatorio.')
      return
    }
    setProductSaving(true)
    setProductError('')
    try {
      await createProduct({ name, category, description: newProduct.description.trim(), is_active: newProduct.is_active })
      await refreshStore()
      await refreshProducts()
      setProductOpen(false)
      setNotice({ type: 'success', text: `Producto "${name}" creado.` })
    } catch (err) {
      setProductError(err.message ?? 'Error al crear el producto.')
    } finally {
      setProductSaving(false)
    }
  }

  function openNewVariant(product) {
    setNewVariant(emptyVariant)
    setVariantError('')
    setVariantProduct(product)
  }

  async function handleCreateVariant(e) {
    e.preventDefault()
    const version = newVariant.version.trim()
    const size = newVariant.size.trim()
    const price = toNumber(newVariant.price)
    if (!version) {
      setVariantError('La versión es obligatoria.')
      return
    }
    if (!size) {
      setVariantError('El talle es obligatorio.')
      return
    }
    if (!(price > 0)) {
      setVariantError('El precio debe ser mayor a 0.')
      return
    }
    setVariantSaving(true)
    setVariantError('')
    try {
      await createVariant({
        product_id: variantProduct.id,
        version,
        size,
        club: newVariant.club.trim(),
        league: newVariant.league.trim(),
        price,
        stock_quantity: Math.max(0, Math.round(toNumber(newVariant.stock_quantity))),
      })
      await refreshStore()
      await refreshProducts()
      setVariantProduct(null)
      setNotice({ type: 'success', text: `Variante "${version} · ${size}" creada en "${variantProduct.name}".` })
    } catch (err) {
      setVariantError(err.message ?? 'Error al crear la variante.')
    } finally {
      setVariantSaving(false)
    }
  }

  if (loading) return <Spinner />

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Productos</h1>

      <Card>
        <div className={styles.toolbar}>
          <input
            className="input"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={openNewProduct}>
            ＋ Nuevo producto
          </button>
        </div>
      </Card>

      {notice.text && (
        <div className={`alert ${notice.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {notice.text}
        </div>
      )}

      <Table columns={['Producto', 'Categoría', 'Variantes', 'Stock total', 'Estado', 'Costo (ARS)', '']}>
        {filtered.map((product) => {
          const variants = product.product_variants ?? []
          const totalStock = variants.reduce((acc, v) => acc + toNumber(v.stock_quantity), 0)
          const hasVariants = variants.length > 0
          const currentCost = toNumber(costsByProduct[product.id])
          const draft = costDrafts[product.id]
          const next = draft === undefined ? null : Math.max(0, toNumber(draft))
          const changed = next !== null && next !== currentCost

          return (
            <Fragment key={product.id}>
              <tr>
                <td>
                  <strong>{product.name}</strong>
                  <div className={styles.sub}>
                    {product.is_active ? 'Activo' : 'Inactivo'} · {variants.length} variantes
                  </div>
                </td>
                <td>
                  <Badge tone="neutral">{product.category ?? '—'}</Badge>
                </td>
                <td className={styles.mono}>
                  {hasVariants ? variants.slice(0, 3).map((v) => variantLabel(v)).join(', ') : '—'}
                </td>
                <td>
                  <Badge tone={totalStock === 0 ? 'red' : totalStock < 10 ? 'amber' : 'green'}>
                    {totalStock}
                  </Badge>
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${product.is_active ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => handleToggle(product)}
                  >
                    {product.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
                <td className={styles.costCell}>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder={currentCost > 0 ? String(currentCost) : 'Sin costo'}
                    value={draft === undefined ? '' : draft}
                    onChange={(e) => setCostDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))}
                  />
                </td>
                <td className={styles.actionCell}>
                  <div className={styles.buttonActions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openNewVariant(product)}>
                    ＋ Variante
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!changed || savingId === product.id}
                    onClick={() => handleSaveCost(product)}
                  >
                    {savingId === product.id ? '…' : 'Guardar'}
                  </button>
                  </div>
                </td>
              </tr>
            </Fragment>
          )
        })}
      </Table>

      <Modal
        title="Nuevo producto"
        open={productOpen}
        onClose={() => setProductOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setProductOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={productSaving}
              onClick={handleCreateProduct}
            >
              {productSaving ? 'Creando…' : 'Crear producto'}
            </button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleCreateProduct}>
          <div className="field">
            <label className="field-label" htmlFor="newProductName">Nombre *</label>
            <input
              id="newProductName"
              className="input"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Ej. Camiseta River 2025"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="newProductCategory">Categoría *</label>
            <input
              id="newProductCategory"
              className="input"
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              placeholder="camisetas"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="newProductDescription">Descripción</label>
            <textarea
              id="newProductDescription"
              className="textarea"
              rows={3}
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="newProductActive">Activo</label>
            <select
              id="newProductActive"
              className="select"
              value={newProduct.is_active ? 'true' : 'false'}
              onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.value === 'true' })}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          {productError && <p className={styles.formError}>{productError}</p>}
        </form>
      </Modal>

      <Modal
        title={variantProduct ? `Nueva variante · ${variantProduct.name}` : 'Nueva variante'}
        open={variantProduct !== null}
        onClose={() => setVariantProduct(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setVariantProduct(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={variantSaving}
              onClick={handleCreateVariant}
            >
              {variantSaving ? 'Creando…' : 'Crear variante'}
            </button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleCreateVariant}>
          <div className={styles.grid2}>
            <div className="field">
              <label className="field-label" htmlFor="newVariantVersion">Versión *</label>
              <input
                id="newVariantVersion"
                className="input"
                value={newVariant.version}
                onChange={(e) => setNewVariant({ ...newVariant, version: e.target.value })}
                placeholder="jugador/fan/retro"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="newVariantSize">Talle *</label>
              <input
                id="newVariantSize"
                className="input"
                value={newVariant.size}
                onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                placeholder="M"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="newVariantClub">Club</label>
              <input
                id="newVariantClub"
                className="input"
                value={newVariant.club}
                onChange={(e) => setNewVariant({ ...newVariant, club: e.target.value })}
                placeholder="River"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="newVariantLeague">Liga</label>
              <input
                id="newVariantLeague"
                className="input"
                value={newVariant.league}
                onChange={(e) => setNewVariant({ ...newVariant, league: e.target.value })}
                placeholder="Liga Profesional"
              />
            </div>
          </div>
          <div className={styles.grid2}>
            <div className="field">
              <label className="field-label" htmlFor="newVariantPrice">Precio (ARS) *</label>
              <input
                id="newVariantPrice"
                className="input"
                type="number"
                min="0"
                value={newVariant.price}
                onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                placeholder="45000"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="newVariantStock">Stock inicial</label>
              <input
                id="newVariantStock"
                className="input"
                type="number"
                min="0"
                value={newVariant.stock_quantity}
                onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: e.target.value })}
              />
            </div>
          </div>
          {variantError && <p className={styles.formError}>{variantError}</p>}
        </form>
      </Modal>
    </div>
  )
}

function variantLabel(variant) {
  const parts = [variant.version, variant.size, variant.club, variant.league].filter(Boolean)
  return parts.join(' · ') || '—'
}
