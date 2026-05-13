import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_BASE } from '../config'
import { apiRequest, assetUrl, downloadCertificatePdf } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { AvailableCourse, Certificate, CourseProgress, DashboardData, StudentProfile } from '../types/api'

function progressPercent(c: CourseProgress): number {
  const total = c.totalModules ?? 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((c.progress / total) * 100))
}

export function Dashboard() {
  const { email } = useAuth()
  const location = useLocation()
  const purchaseOk = Boolean((location.state as { purchaseOk?: boolean } | null)?.purchaseOk)
  const [data, setData] = useState<DashboardData | null>(null)
  const [certs, setCerts] = useState<Certificate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress | null>>({})
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const dash = await apiRequest<DashboardData>('/api/dashboard')
      setData(dash.data)
      try {
        const prof = await apiRequest<StudentProfile>('/api/profile')
        const pic = prof.data?.profilePicture?.trim()
        setProfilePicture(pic || null)
        setAvatarKey((k) => k + 1)
      } catch {
        setProfilePicture(null)
      }
      const em = dash.data?.email ?? email
      if (em) {
        const listRes = await fetch(`${API_BASE}/api/certificates/${encodeURIComponent(em)}`)
        if (listRes.ok) {
          setCerts((await listRes.json()) as Certificate[])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el panel')
    }
  }, [email])

  useEffect(() => {
    void load()
  }, [load])

  async function loadProgress(courseId: string) {
    setLoadingProgress(courseId)
    try {
      const res = await apiRequest<CourseProgress>(`/api/progress/${encodeURIComponent(courseId)}`)
      setProgressMap((m) => ({ ...m, [courseId]: res.data }))
    } catch {
      setProgressMap((m) => ({ ...m, [courseId]: null }))
    } finally {
      setLoadingProgress(null)
    }
  }

  if (error) {
    return (
      <div className="duo-page duo-fade-in">
        <div className="duo-banner duo-banner-error">{error}</div>
        <button type="button" className="duo-btn duo-btn-rose" onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="duo-loading">
        <div className="duo-spinner" />
      </div>
    )
  }

  const lessonStat = data.enrolledCourses.reduce((acc, c) => acc + (c.progress || 0), 0)

  return (
    <div className="duo-page duo-fade-in">
      {purchaseOk ? (
        <div className="duo-banner" style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>
          ¡Compra simulada completada! Las inscripciones deberían aparecer aquí cuando learning-students
          procese el evento (RabbitMQ en marcha).
        </div>
      ) : null}

      <header className="duo-dash-header">
        <div className="duo-dash-avatar">
          {profilePicture ? (
            <img
              src={`${assetUrl(profilePicture)}?v=${avatarKey}`}
              alt="Foto de perfil"
              loading="lazy"
            />
          ) : (
            <span aria-hidden>👤</span>
          )}
        </div>
        <div>
          <div className="duo-pill duo-pill-rose">Hola</div>
          <h1 className="duo-title" style={{ marginBottom: '0.25rem' }}>
            {data.name}
          </h1>
          <p className="duo-subtitle" style={{ fontSize: '0.95rem' }}>
            {data.email} · Sigue con tu aprendizaje hoy.
          </p>
        </div>
      </header>

      <div className="duo-stats">
        <div className="duo-stat-card">
          <div className="duo-stat-icon rose" aria-hidden>
            📚
          </div>
          <div>
            <div className="duo-stat-val">{data.enrolledCourses.length}</div>
            <div className="duo-stat-lbl">Cursos</div>
          </div>
        </div>
        <div className="duo-stat-card">
          <div className="duo-stat-icon sky" aria-hidden>
            ⏱
          </div>
          <div>
            <div className="duo-stat-val">{lessonStat}</div>
            <div className="duo-stat-lbl">Avance módulos</div>
          </div>
        </div>
        <div className="duo-stat-card">
          <div className="duo-stat-icon amber" aria-hidden>
            🏆
          </div>
          <div>
            <div className="duo-stat-val">{data.totalCertificates}</div>
            <div className="duo-stat-lbl">Certificados</div>
          </div>
        </div>
      </div>

      <div className="duo-dash-actions">
        <Link to="/catalog" className="duo-btn duo-btn-rose">
          Explorar catálogo
        </Link>
        <Link to="/cart" className="duo-btn duo-btn-sky">
          Ver carrito
        </Link>
      </div>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="duo-section-title">Ruta de aprendizaje</h2>
        {data.enrolledCourses.length === 0 ? (
          <div className="duo-empty">
            <p style={{ marginBottom: '1rem' }}>Aún no tienes cursos inscritos.</p>
            <Link to="/catalog" className="duo-btn duo-btn-rose">
              Elegir un curso
            </Link>
          </div>
        ) : (
          data.enrolledCourses.map((c) => {
            const pct = progressPercent(c)
            return (
              <article key={c.courseId} className="duo-path-card">
                <div
                  className="duo-ring"
                  style={{
                    borderColor: pct > 0 ? '#a7f3d0' : '#f1f5f9',
                  }}
                >
                  <div className={`duo-ring-inner${c.completed ? ' done' : ''}`} aria-hidden>
                    {c.completed ? '✓' : '📖'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="duo-chip" style={{ marginBottom: '0.35rem' }}>
                    Curso
                  </div>
                  <h3 className="duo-course-title">{c.courseName}</h3>
                  <p className="duo-muted small">ID: {c.courseId}</p>
                  <div className="duo-progress-track" style={{ marginTop: '0.75rem' }}>
                    <div className="duo-progress-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="duo-muted small" style={{ marginTop: '0.5rem' }}>
                    Módulos: {c.progress}/{c.totalModules}
                    {c.completed ? (
                      <span style={{ color: '#059669', fontWeight: 800, marginLeft: '0.5rem' }}>
                        Completado
                      </span>
                    ) : null}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <Link
                      to={`/forum/${encodeURIComponent(c.courseId)}`}
                      className="duo-btn duo-btn-sky small"
                    >
                      Foro
                    </Link>
                    <button
                      type="button"
                      className="duo-btn duo-btn-ghost small"
                      onClick={() => void loadProgress(c.courseId)}
                      disabled={loadingProgress === c.courseId}
                    >
                      {loadingProgress === c.courseId ? 'Cargando…' : 'Detalle API'}
                    </button>
                  </div>
                  {progressMap[c.courseId] ? (
                    <p className="duo-muted small mono" style={{ marginTop: '0.5rem' }}>
                      API: {progressMap[c.courseId]?.progress}/{progressMap[c.courseId]?.totalModules}{' '}
                      módulos
                    </p>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="duo-section-title">Catálogo (API estudiantes)</h2>
        {data.availableCourses.length === 0 ? (
          <div className="duo-card-block">
            <p className="duo-muted" style={{ margin: 0 }}>
              El backend aún puede devolver la lista vacía. Usa <strong>Explorar</strong> para cargar
              cursos reales desde learning-engine y añadirlos al carrito.
            </p>
            <Link to="/catalog" className="duo-btn duo-btn-rose small" style={{ marginTop: '0.75rem' }}>
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <div className="duo-course-grid">
            {data.availableCourses.map((c: AvailableCourse) => (
              <article key={c.courseId} className="duo-course-card">
                <div className="duo-course-body">
                  {c.imageUrl ? (
                    <img className="duo-course-img" src={assetUrl(c.imageUrl)} alt="" loading="lazy" />
                  ) : null}
                  <h3 className="duo-course-title">{c.title}</h3>
                  <p className="duo-course-desc">{c.description}</p>
                  <p className="duo-price">{c.price === 0 ? 'Gratis' : `${c.price.toFixed(2)} €`}</p>
                  {c.enrolled ? <span className="duo-in-cart">Inscrito</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2 className="duo-section-title">Certificados</h2>
        {certs.length === 0 ? (
          <p className="duo-muted">No hay certificados registrados.</p>
        ) : (
          <ul className="duo-cart-list">
            {certs.map((cert) => (
              <li key={cert.id} className="duo-cart-row">
                <div>
                  <strong>{cert.courseName}</strong>
                  <p className="duo-muted small">
                    Emitido: {new Date(cert.issuedAt).toLocaleString()}
                    {cert.sent ? ' · Enviado' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="duo-btn duo-btn-sky small"
                  onClick={() => void downloadCertificatePdf(cert.id)}
                >
                  PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
