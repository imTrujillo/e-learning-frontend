import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="duo-auth-wrap">
      <div className="duo-auth-card duo-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div className="duo-brand-icon" style={{ margin: '0 auto 1rem' }}>
            📖
          </div>
          <h1 className="duo-title" style={{ textAlign: 'center', margin: 0 }}>
            Ingresar
          </h1>
          <p className="duo-muted" style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Continúa aprendiendo
          </p>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
          <label className="duo-label">
            Correo
            <input
              className="duo-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="duo-label">
            Contraseña
            <input
              className="duo-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/forgot-password" className="duo-link-back" style={{ margin: 0, fontSize: '0.8rem' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button type="submit" className="duo-btn duo-btn-rose duo-btn-block" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontWeight: 600, color: '#64748b' }}>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
