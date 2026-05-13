import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function GuestShell() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="duo-shell">
      <header className="duo-topbar">
        <Link to="/" className="duo-brand">
        <span className="duo-brand-icon" aria-hidden>
            🧑‍💻
          </span>
          Ing Web Learning 
        </Link>
        <nav className="duo-nav" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="duo-btn duo-btn-sky small">
              Ir al panel
            </Link>
          ) : (
            <>
              <Link to="/login" className="duo-btn duo-btn-ghost small">
                Entrar
              </Link>
              <Link to="/register" className="duo-btn duo-btn-rose small">
                Registro
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="duo-main">
        <Outlet />
      </main>
    </div>
  )
}
