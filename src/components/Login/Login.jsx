import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { APP_NAME } from '../../config/constants'
import styles from './Login.module.css'

export default function Login() {
  const { signIn, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(signInError.message || 'Email o contraseña incorrectos.')
        return
      }
      if (isAdmin) {
        navigate('/', { replace: true })
      }
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/logo.png" alt="Vak Store" />
          <h1 className={styles.title}>{APP_NAME}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
