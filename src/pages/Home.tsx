import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="duo-page duo-fade-in duo-hero">
      <div className="duo-hero-grid">
        <div>
          <div className="duo-pill duo-pill-sky">Campus virtual</div>
          <h1>Tu ruta de aprendizaje, con estilo claro y diversión</h1>
          <p className="duo-hero-lede">
            Progreso por curso, foros por asignatura, certificados y compra simulada que activa tu
            inscripción en el motor.
          </p>
          <div className="duo-hero-actions">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="duo-btn duo-btn-rose">
                  Mi progreso
                </Link>
                <Link to="/catalog" className="duo-btn duo-btn-sky">
                  Explorar cursos
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="duo-btn duo-btn-rose">
                  Iniciar sesión
                </Link>
                <Link to="/register" className="duo-btn duo-btn-sky">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="duo-card-block" style={{ margin: 0 }}>
          <h2 className="duo-summary-title" style={{ marginTop: 0 }}>
            Qué puedes hacer
          </h2>
          <ul className="duo-summary-list" style={{ fontSize: '0.95rem' }}>
            <li style={{ border: 'none', padding: '0.6rem 0' }}>
              <span>📚 Catálogo real desde learning-engine</span>
            </li>
            <li style={{ border: 'none', padding: '0.6rem 0' }}>
              <span>🛒 Carrito y pago simulado con tarjeta</span>
            </li>
            <li style={{ border: 'none', padding: '0.6rem 0' }}>
              <span>✅ Activación de inscripción + RabbitMQ</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
