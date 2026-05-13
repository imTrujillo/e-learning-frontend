import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import {
  activateEngineEnrollment,
  createEngineEnrollment,
  ensureEngineStudent,
} from '../lib/engineApi'

function normalizeCardNumber(s: string): string {
  return s.replace(/\s+/g, '')
}

function luhnValid(num: string): boolean {
  const d = num.replace(/\D/g, '')
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48
    if (n < 0 || n > 9) return false
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function validExpiry(s: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(s.trim())
  if (!m) return false
  const month = Number(m[1])
  return month >= 1 && month <= 12
}

export function Checkout() {
  const { email } = useAuth()
  const { items, clear } = useCart()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email) {
      setError('No hay sesión. Vuelve a iniciar sesión.')
      return
    }
    if (items.length === 0) {
      setError('El carrito está vacío.')
      return
    }
    const num = normalizeCardNumber(card)
    if (!luhnValid(num)) {
      setError('Número de tarjeta no válido (usa 16 dígitos que pasen Luhn, p. ej. 4242 4242 4242 4242).')
      return
    }
    if (!validExpiry(expiry)) {
      setError('Caducidad inválida. Usa MM/AA.')
      return
    }
    if (!/^\d{3,4}$/.test(cvv.trim())) {
      setError('CVV inválido (3 o 4 dígitos).')
      return
    }
    if (name.trim().length < 2) {
      setError('Indica el titular de la tarjeta.')
      return
    }

    setBusy(true)
    try {
      const sync = await ensureEngineStudent(email)
      if (!sync.ok) {
        throw new Error(sync.message)
      }

      for (const line of items) {
        const created = await createEngineEnrollment(line.courseId, email)
        if (!created.ok) {
          const msg = created.message
          if (!msg.includes('ya está inscrito')) {
            throw new Error(msg || 'No se pudo crear la inscripción')
          }
        }
        const act = await activateEngineEnrollment(email, line.courseId)
        if (!act.ok) {
          throw new Error(act.message || 'No se pudo activar la inscripción')
        }
      }

      clear()
      navigate('/dashboard', { replace: true, state: { purchaseOk: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar el pago simulado')
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="duo-page duo-fade-in">
        <div className="duo-empty">
          <p>No hay artículos para pagar.</p>
          <Link to="/cart" className="duo-btn duo-btn-rose" style={{ marginTop: '1rem' }}>
            Volver al carrito
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="duo-page duo-fade-in narrow">
      <div className="duo-pill duo-pill-rose">Simulación</div>
      <h1 className="duo-title">Pago con tarjeta (demo)</h1>
      <p className="duo-subtitle">
        No se procesa ningún cargo real. Tras validar el formulario se crea y activa la inscripción en
        learning-engine (evento RabbitMQ hacia learning-students si está en marcha).
      </p>

      <div className="duo-checkout-grid">
        <form className="duo-card-block" onSubmit={onSubmit}>
          {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
          <label className="duo-label">
            Titular
            <input
              className="duo-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="cc-name"
              placeholder="Nombre en la tarjeta"
            />
          </label>
          <label className="duo-label">
            Número
            <input
              className="duo-input"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
            />
          </label>
          <div className="duo-row-2">
            <label className="duo-label">
              Caducidad
              <input
                className="duo-input"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                autoComplete="cc-exp"
                placeholder="MM/AA"
              />
            </label>
            <label className="duo-label">
              CVV
              <input
                className="duo-input"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                autoComplete="cc-csc"
                placeholder="123"
              />
            </label>
          </div>
          <button type="submit" className="duo-btn duo-btn-rose duo-btn-block" disabled={busy}>
            {busy ? 'Procesando…' : 'Confirmar y activar inscripciones'}
          </button>
          <Link to="/cart" className="duo-link-back" style={{ display: 'block', marginTop: '0.75rem' }}>
            ← Volver al carrito
          </Link>
        </form>

        <aside className="duo-summary-aside">
          <h2 className="duo-summary-title">Resumen</h2>
          <ul className="duo-summary-list">
            {items.map((i) => (
              <li key={i.courseId}>
                <span>{i.title}</span>
                <span>{i.price > 0 ? `${i.price.toFixed(2)} €` : '0 €'}</span>
              </li>
            ))}
          </ul>
          <div className="duo-summary-total">
            <span>Total</span>
            <span>{items.reduce((s, i) => s + i.price, 0).toFixed(2)} €</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
