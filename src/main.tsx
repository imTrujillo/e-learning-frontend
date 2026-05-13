import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import './styles/duo.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
