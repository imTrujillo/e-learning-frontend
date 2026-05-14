import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useMyEngineEnrollments } from '../hooks/useMyEngineEnrollments'

export function Cart() {
  const { email } = useAuth()
  const { items, removeItem, total, clear } = useCart()
  const { activeCourseIds, loading: enrollLoading } = useMyEngineEnrollments(email)

  useEffect(() => {
    if (enrollLoading || activeCourseIds.size === 0) return
    for (const i of items) {
      if (activeCourseIds.has(i.courseId)) removeItem(i.courseId)
    }
  }, [enrollLoading, activeCourseIds, items, removeItem])

  return (
    <div className="duo-page duo-fade-in">
      <div className="duo-catalog-head">
        <div>
          <div className="duo-pill duo-pill-sky">🛒 Carrito</div>
          <h1 className="duo-title">Tu selección</h1>
          <p className="duo-subtitle">Revisa los cursos antes de simular el pago.</p>
        </div>
        <div className="duo-cart-actions">
          {items.length > 0 ? (
            <button type="button" className="duo-btn duo-btn-ghost" onClick={clear}>
              Vaciar
            </button>
          ) : null}
          <Link to="/catalog" className="duo-btn duo-btn-sky">
            Seguir comprando
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="duo-empty">
          <p>Tu carrito está vacío.</p>
          <Link to="/catalog" className="duo-btn duo-btn-rose" style={{ marginTop: '1rem' }}>
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="duo-cart-list">
            {items.map((i) => (
              <li key={i.courseId} className="duo-cart-row">
                <div>
                  <strong>{i.title}</strong>
                  <p className="duo-muted small">ID curso: {i.courseId}</p>
                </div>
                <div className="duo-cart-row-right">
                  <span className="duo-price">{i.price > 0 ? `${i.price.toFixed(2)} €` : 'Gratis'}</span>
                  <button
                    type="button"
                    className="duo-btn duo-btn-ghost small"
                    onClick={() => removeItem(i.courseId)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="duo-cart-summary">
            <div>
              <span className="duo-muted">Total simulado</span>
              <div className="duo-total">{total.toFixed(2)} €</div>
            </div>
            <Link to="/checkout" className="duo-btn duo-btn-rose">
              Pagar
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
