import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Layout from './components/Layout/Layout'
import Login from './components/Login/Login'
import Dashboard from './screens/Dashboard/Dashboard'
import Orders from './screens/Orders/Orders'
import Stock from './screens/Stock/Stock'
import Products from './screens/Products/Products'
import Reports from './screens/Reports/Reports'
import Ventas from './screens/Ventas/Ventas'
import Finanzas from './screens/Finanzas/Finanzas'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pedidos" element={<Orders />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/productos" element={<Products />} />
              <Route path="/finanzas" element={<Finanzas />} />
              <Route path="/reportes" element={<Reports />} />
            </Route>
          </Route>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
