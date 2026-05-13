import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') ?? '', [params])
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!token) {
      setError('Falta el token en la URL.')
      return
    }
    setLoading(true)
    try {
      const q = new URLSearchParams({ token, newPassword: password })
      const res = await apiRequest<null>(`/api/auth/reset-password?${q.toString()}`, {
        method: 'POST',
        skipAuth: true,
      })
      setMessage(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page narrow">
      <div className="card">
        <h1>Nueva contraseña</h1>
        {!token ? <p className="alert error">Este enlace no es válido.</p> : null}
        <form className="form" onSubmit={onSubmit}>
          {error ? <p className="alert error">{error}</p> : null}
          {message ? (
            <p className="alert success">
              {message}{' '}
              <Link to="/login">Iniciar sesión</Link>
            </p>
          ) : null}
          <label>
            Nueva contraseña
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!token}
            />
          </label>
          <button type="submit" className="btn primary full" disabled={loading || !token}>
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
