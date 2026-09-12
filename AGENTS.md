# AGENTS.md

Guía de contexto para agentes/desarrolladores que trabajen en este proyecto.

## Visión general

**Vak Store · Back Office** es un sistema interno de administración para el ecommerce Vak Store. Se conecta a la **misma base de datos Supabase** que usa la tienda en producción: todo lo que se actualiza acá (stock, estados de pedido, ventas manuales, costos) se ve reflejado al instante en la tienda.

La interfaz está en español. No es un proyecto público: solo acceden los 2 administradores (lista blanca de emails).

## Stack

- Vite + React 19 (**JavaScript, no TypeScript**).
- React Router (rutas de la app).
- `@supabase/supabase-js` como cliente directo a la BD (no hay backend propio).
- **CSS Modules** por componente (`*.module.css`). Utilidades globales (`.btn`, `.input`, `.select`, `.field`, `.alert`) en `src/index.css`.
- **Design tokens** (colores, sombras, radios) definidos como variables CSS en `src/index.css` (`:root`). El acento es índigo (`--accent: #6366f1`); cambiar colores solo desde ahí, no hardcodear.
- Logo/brand en `public/logo.png` (favicon en `index.html` + logo del sidebar y login).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run lint     # ESLint (debe pasar limpio)
npm run build    # build de producción
npm run preview  # previsualizar build
```

## Configuración / Entorno

Variables en `.env` (NO se committea; copiar desde `.env.example`):

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_ADMIN_EMAILS=admin1@correo.com,admin2@correo.com   # separados por coma, SIN comillas
```

- La URL debe ser completa (`.supabase.co`, no `.supabase.com` ni solo el ref).
- `VITE_ADMIN_EMAILS` es la lista blanca del login: el back office solo funciona si el email del usuario logueado está ahí.
- El login usa Supabase Auth (email + contraseña). Los usuarios se crean en el panel de Supabase (`Authentication → Users`).

## Base de datos (Supabase)

### Tablas existentes del ecommerce (NO modificar esquema)
`products`, `product_variants`, `orders`, `order_items`, `cart_items`, `profiles`, `shipping_methods`, `webhook_events`.

Campos clave:
- `product_variants`: `product_id`, `version`, `size`, `club`, `league`, `stock_quantity`, `price`.
- `orders`: `status`, `payment_method`, `total_amount`, `shipping_*`, `carrier`, `tracking_number`, `shipped_at`, `payment_intent_id`, `bank_info_snapshot`, `customer_name`, `email`, `phone`.
- `order_items`: `order_id`, `product_variant_id`, `quantity`, `unit_price`.

### Agregados por el back office (scripts en `supabase/`)
- `migration.sql`: crea la tabla `product_costs` (`product_id` → `cost`, RLS admin) y la función `public.is_back_office_admin()` (devuelve true si el JWT es de un email admin). **Solo agrega, no toca tablas existentes.**
- `rls_back_office.sql`: políticas RLS **aditivas** (select/insert/update para los emails admin) sobre `orders`, `order_items`, `product_variants`, `products`, `product_costs`. Habilita todas las escrituras del back office: ventas, stock, estados, **alta de productos/variantes** y costos. Correrlo en Supabase; sin esto las escrituras fallan con error de permisos. **Ya aplicado en producción.**

## Reglas de negocio

### Modelo de ganancia
Por cada item vendido: `cuenta = venta − costo`. Luego se reparte la cuenta en porcentajes **fijos** (constantes en `src/config/constants.js`):

- `PROFIT_PERCENT = 55` → ganancia
- `MARKETING_PERCENT = 30` → marketing
- `REINVESTMENT_PERCENT = 15` → reinversión extra

La **reinversión total = costo + 15% de la cuenta** (el costo vuelve 100% a reinversión).

- El **costo vive en la tabla `product_costs`** (centralizado, compartido entre los 2 admins), keyed por `product_id`. Se edita en la pantalla Productos.
- `MP_FEE_PERCENT = 0`: comisión de MercadoPago **no se descuenta por ahora** (feature futura).
- **Envío neutro**: lo paga el cliente 100%. Nunca afecta la cuenta venta − costo. Se guarda solo en `orders.shipping_cost` y no entra en los cálculos de ganancia.
- **Venta real = `total_amount − shipping_cost`**: el back office calcula la venta desde el total del pedido, no desde `order_items.unit_price`. La tienda aplica un **15% de descuento por transferencia** (`TRANSFER_DISCOUNT` en el store) que **no se guarda por item**: `order_items.unit_price` queda al precio de lista y solo `orders.total_amount` refleja el neto. `orderRevenueFactor(order, ...)` (`src/lib/profit.js`) reparte la venta real proporcionalmente entre los items (factor = 1 en MP y ventas manuales, 0,85 en transferencias).

### Status de pedido (columna `orders.status`)
`pending` (Pendiente MP), `awaiting_payment` (Esperando pago transferencia), `paid`, `processing` (Procesando), `shipped` (Enviado), `delivered` (Entregado), `cancelled` (Cancelado). Ver `ORDER_STATUSES` / `ORDER_STATUS_LABELS` en constants.

- El valor real que escribe la tienda para transferencia es **`awaiting_payment`** (con `ing`). El back office lo adopta como canónico y `normalizeOrderStatus()` (`src/lib/orders.js`) mapea el alias viejo **`await_payment`** para no romper pedidos históricos/ventas manuales.

- `payment_status` es **redundante** y el back office **no lo gestiona** (se eliminó de toda la UI). No escribirlo ni leerlo.
- Al pasar un pedido a `shipped`, se setea `shipped_at` automáticamente si no tenía (`src/screens/Orders/Orders.jsx`).
- Modificar el estado desde acá es un `UPDATE` directo a la BD compartida: el cliente lo ve en la tienda al instante.

### Solo pedidos cobrados en números
Dashboard (KPIs + gráfica) y Reportes cuentan **únicamente** pedidos con status en `paid/processing/shipped/delivered` (helper `isPaidOrder` en `src/lib/orders.js`). `pending`, `awaiting_payment` y `cancelled` quedan fuera de ventas/ganancia.

### Ventas manuales (pantalla Ventas)
- Se insertan directo en `orders` + `order_items` (filas nuevas, sin tocar esquema) y **descuentan stock** de cada variante.
- Se identifican por el helper `isManualOrder`: orden sin `payment_intent_id`, sin `bank_info_snapshot` y sin `payment_status` (la tienda siempre setea `payment_status` al crear, incluso en `pending`; el back office nunca lo escribe).
- Métodos de envío: `retira_local` (costo $0), `motomensajeria`, más los registros de `shipping_methods`.
- Al guardar: crea la orden, los items y actualiza `stock_quantity`. Puede fallar con error de permisos si no se corrió `rls_back_office.sql`.

### Alta de productos y variantes (pantalla Productos)
- El back office puede **crear productos y variantes** (no solo editar existentes): botón **"＋ Nuevo producto"** en la toolbar y **"＋ Variante"** por fila de producto (modales reutilizando `Modal`).
- Son inserts directos en `products` / `product_variants` vía `createProduct` y `createVariant` (`src/lib/api.js`). Requieren las políticas de insert de `rls_back_office.sql` (ya cubiertas).
- El alta **no pide imágenes**: la columna `products.images` se carga por Supabase/BD.
- La variante nueva aparece al instante en Stock (para ajustar stock) y en Ventas (para venderla). El costo se asigna después en Productos (columna "Costo (ARS)").

## Arquitectura

```
src/
  main.jsx / App.jsx           # entry + rutas
  supabaseClient.js            # cliente Supabase (leyendo .env)
  config/constants.js          # porcentajes, status, métodos de pago, emails admin
  context/auth.js              # AuthContext + useAuth (hook)
  context/AuthContext.jsx      # AuthProvider (solo el componente)
  hooks/
    useStoreData.js            # orders + variants + costs (compartido)
    useProducts.js
    useShippingMethods.js
  lib/
    api.js                     # queries/escrituras a Supabase
    profit.js                  # splitProfit, buildOrderItemMetrics, buildProductReport
    format.js                  # formatMoney, formatDate, toNumber
    orders.js                  # isPaidOrder, isManualOrder, shipping labels
    variant.js                 # variantLabel(variant)
  components/
    common/                    # Card, Table, Badge, Modal, Spinner, StatusBadge (cada uno con su .module.css)
    Layout/                    # sidebar + topbar + íconos inline SVG
    ProtectedRoute/            # gate de auth + lista blanca
    Login/
  screens/                     # Dashboard, Ventas (+NewSaleForm), Orders, Stock, Products, Reports
```

Rutas: `/login` → `/` (Dashboard), `/ventas`, `/pedidos`, `/stock`, `/productos`, `/reportes`.

## Convenciones y gotchas

- **Sin comentarios en el código** (preferencia del usuario). Los archivos SQL sí pueden llevar comentarios explicativos.
- **No exportar no-componentes desde archivos de componentes** (regla `react-refresh/only-export-components`). Por eso `useAuth` vive en `context/auth.js` y `AuthProvider` en `AuthContext.jsx`.
- **Regla `react-hooks/set-state-in-effect`**: en los hooks de fetch, el patrón válido es declarar la función `load()` dentro del `useEffect` (con flag `cancelled`) y usar un `reloadKey` para refrescar desde handlers. No llamar funciones que setean estado sincrónicamente dentro del efecto.
- **Rutas relativas**: desde `src/screens/X/` los componentes comunes van a `../../components/common/...`.
- **Windows / FS case-insensitive**: `context/auth.js` y `context/AuthContext.jsx` son archivos distintos; no renombrarlos de forma ambigua.
- El `.env`, los `*.csv` de esquema y `dist/` están en `.gitignore`.

## Setup en una máquina nueva

1. `npm install`.
2. Copiar `.env.example` a `.env` y completar URL + anon key + emails admin.
3. En el panel de Supabase: crear los 2 usuarios en `Authentication → Users`, habilitar Email auth (opcional: desactivar "Confirm email" para login directo).
4. Correr `supabase/migration.sql` en el SQL Editor (verificar/actualizar los emails admin de la función `is_back_office_admin`).
5. Para poder escribir (ventas/stock/estados/altas): correr `supabase/rls_back_office.sql`.

## Deploy (Vercel, en producción)

- **URL**: https://vak-store-back-office.vercel.app
- Hosting estático en Vercel: detecta Vite solo (build `npm run build`, output `dist`).
- `vercel.json` con SPA fallback: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. Es **obligatorio** porque la app usa `BrowserRouter`; sin esto, refrescar o entrar directo a `/ventas`, `/stock`, etc. da 404.
- Variables en Vercel (Settings → Environment Variables, cargadas **antes** del build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAILS`. Si faltan, el build compila pero la app queda en blanco en runtime.
- Supabase Auth: la **Site URL** queda con el dominio de la tienda online (el back office no la necesita: el login es email+contraseña sin redirecciones). Opcional: agregar el dominio del back office a *Redirect URLs*.
- Cada `git push` a `main` redeployea solo. El login solo deja entrar a los 2 emails admin.
