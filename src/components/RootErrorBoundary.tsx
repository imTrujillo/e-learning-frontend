import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RootErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page narrow" style={{ padding: '2rem' }}>
          <div className="card">
            <h1>Error al cargar la aplicación</h1>
            <p className="alert error">{this.state.error.message}</p>
            <p className="muted small">
              Abre la consola del navegador (F12) para más detalle. Si acabas de actualizar el código,
              prueba recargar con Ctrl+Shift+R.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => this.setState({ error: null })}
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
