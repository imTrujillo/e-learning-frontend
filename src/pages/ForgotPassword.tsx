import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await apiRequest<null>(
        `/api/auth/forgot-password?email=${encodeURIComponent(email.trim())}`,
        { method: 'POST', skipAuth: true },
      )
      setMessage(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar el enlace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="duo-auth-wrap">
      <div className="duo-auth-card duo-fade-in">
        <div className="duo-pill duo-pill-sky">Acceso</div>
        <h1 className="duo-title" style={{ marginTop: '0.5rem' }}>
          Recuperar contraseña
        </h1>
        <p className="duo-muted" style={{ fontWeight: 600 }}>
          Te enviaremos un enlace si el correo existe en el sistema.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
          {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
          {message ? (
            <div className="duo-banner" style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>
              {message}
            </div>
          ) : null}
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
          <button type="submit" className="duo-btn duo-btn-sky duo-btn-block" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </button>
          <p style={{ textAlign: 'center', margin: 0 }}>
            <Link to="/login" className="duo-link-back" style={{ display: 'inline' }}>
              Volver al inicio de sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
