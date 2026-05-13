import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const sessionKey = (token: string) => `email-confirm:${token}`

/** Una sola petición por token (evita doble llamada en React StrictMode / remounts). */
const confirmOnce = new Map<string, Promise<string>>()

function getConfirmPromise(token: string): Promise<string> {
  const cachedMsg = sessionStorage.getItem(sessionKey(token))
  if (cachedMsg) {
    return Promise.resolve(cachedMsg)
  }
  let p = confirmOnce.get(token)
  if (!p) {
    p = apiRequest<null>(`/api/auth/confirm?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true,
    })
      .then((res) => {
        sessionStorage.setItem(sessionKey(token), res.message)
        return res.message
      })
      .finally(() => {
        confirmOnce.delete(token)
      })
    confirmOnce.set(token, p)
  }
  return p
}

export function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') ?? '', [params])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Falta el token de confirmación.')
      return
    }

    let alive = true
    setError(null)
    setMessage(null)

    const hit = sessionStorage.getItem(sessionKey(token))
    if (hit) {
      setMessage(hit)
      return
    }

    void getConfirmPromise(token)
      .then((msg) => {
        if (alive) setMessage(msg)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'No se pudo confirmar')
      })

    return () => {
      alive = false
    }
  }, [token])

  return (
    <div className="page narrow">
      <div className="card">
        <h1>Confirmar correo</h1>
        {!token ? <p className="alert error">Enlace incompleto.</p> : null}
        {error ? <p className="alert error">{error}</p> : null}
        {message ? (
          <p className="alert success">
            {message} <Link to="/login">Iniciar sesión</Link>
          </p>
        ) : null}
        {!message && !error && token ? <p className="muted">Confirmando…</p> : null}
      </div>
    </div>
  )
}
