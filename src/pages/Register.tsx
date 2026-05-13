import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export function Register() {
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await apiRequest<null>('/api/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: { name, lastName, email: email.trim(), password },
      })
      setMessage(res.message || 'Revisa tu correo para confirmar la cuenta.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="duo-auth-wrap">
      <div className="duo-auth-card duo-fade-in">
        <h1 className="duo-title" style={{ marginTop: 0 }}>
          Crear cuenta
        </h1>
        <p className="duo-muted" style={{ fontWeight: 600 }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
          {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
          {message ? (
            <div className="duo-banner" style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>
              {message}
            </div>
          ) : null}
          <label className="duo-label">
            Nombre
            <input className="duo-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="duo-label">
            Apellido
            <input
              className="duo-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>
          <label className="duo-label">
            Correo
            <input
              className="duo-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="duo-label">
            Contraseña (mín. 6)
            <input
              className="duo-input"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="duo-btn duo-btn-rose duo-btn-block" disabled={loading}>
            {loading ? 'Enviando…' : 'Registrarme'}
          </button>
        </form>
      </div>
    </div>
  )
}
