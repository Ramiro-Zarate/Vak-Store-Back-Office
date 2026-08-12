import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { APP_NAME } from '../../config/constants'
import styles from './Layout.module.css'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/ventas', label: 'Ventas' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/stock', label: 'Stock' },
  { to: '/productos', label: 'Productos' },
  { to: '/reportes', label: 'Reportes' },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>VK</span>
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
