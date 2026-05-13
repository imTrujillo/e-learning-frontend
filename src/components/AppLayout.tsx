import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function AppLayout() {
  const { email, logout } = useAuth()
  const { count } = useCart()

  return (
    <div className="duo-shell">
      <header className="duo-topbar">
        <Link to="/dashboard" className="duo-brand">
          <span className="duo-brand-icon" aria-hidden>
            🧑‍💻
          </span>
          Ing Web Learning 
        </Link>
        <nav className="duo-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'active' : '')}
            end
          >
            Mi progreso
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) => `duo-nav-accent${isActive ? ' active' : ''}`}
          >
            Explorar
          </NavLink>
          <NavLink to="/profile">Perfil</NavLink>
        </nav>
        <div className="duo-user">
          <Link to="/cart" className="duo-btn duo-btn-ghost small">
            Carrito{count > 0 ? ` (${count})` : ''}
          </Link>
          <span className="duo-user-email" title={email ?? ''}>
            {email}
          </span>
          <button type="button" className="duo-btn duo-btn-ghost small" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="duo-main">
        <Outlet />
      </main>
    </div>
  )
}
