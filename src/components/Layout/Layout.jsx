import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { APP_NAME } from '../../config/constants'
import styles from './Layout.module.css'

const icons = {
  dashboard: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  ),
  ventas: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h12l-4 5.5V16l-4-1.5V9.5L4 4z" strokeLinejoin="round" />
    </svg>
  ),
  pedidos: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="13" height="13" rx="2" />
      <path d="M6.5 8h7M6.5 11h7M6.5 14h4" strokeLinecap="round" />
    </svg>
  ),
  stock: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="14" height="4" rx="1.5" />
      <rect x="3" y="12" width="14" height="4" rx="1.5" />
    </svg>
  ),
  productos: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3l7 3.5v7L10 17l-7-3.5v-7L10 3z" strokeLinejoin="round" />
      <path d="M3.5 6.5L10 10l6.5-3.5M10 10v7" strokeLinejoin="round" />
    </svg>
  ),
  finanzas: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M3 8.5h14" strokeLinecap="round" />
      <path d="M12.5 12.5h2" strokeLinecap="round" />
    </svg>
  ),
  reportes: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 15.5v-4M10 15.5v-8M16 15.5v-5" strokeLinecap="round" />
    </svg>
  ),
}

const links = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/ventas', label: 'Ventas', icon: icons.ventas },
  { to: '/pedidos', label: 'Pedidos', icon: icons.pedidos },
  { to: '/stock', label: 'Stock', icon: icons.stock },
  { to: '/productos', label: 'Productos', icon: icons.productos },
  { to: '/finanzas', label: 'Finanzas', icon: icons.finanzas },
  { to: '/reportes', label: 'Reportes', icon: icons.reportes },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/logo.png" alt="Vak Store" />
          <span className={styles.brandText}>{APP_NAME}</span>
        </div>
        <nav className={styles.nav}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.userEmail}>{user?.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            Cerrar sesión
          </button>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
