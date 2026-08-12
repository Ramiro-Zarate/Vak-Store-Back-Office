import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import Spinner from '../common/Spinner/Spinner'

export default function ProtectedRoute() {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="empty" style={{ paddingTop: 80 }}>
        <h2 style={{ marginBottom: 8 }}>Acceso restringido</h2>
        <p>Tu email no está habilitado para ingresar al back office.</p>
      </div>
    )
  }

  return <Outlet />
}
