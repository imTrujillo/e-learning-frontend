import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useMyEngineEnrollments } from '../hooks/useMyEngineEnrollments'
import { downloadCertificatePdf, fetchStudentCertificates } from '../lib/api'
import {
  completeEngineLesson,
  fetchEngineCourse,
  fetchEngineCourseModules,
} from '../lib/engineApi'
import { enrollmentForCourse, resolveCoursePurchaseAction } from '../lib/engineEnrollmentUi'
import type { Certificate } from '../types/api'
import type { EngineCourse, EngineLesson, EngineModule } from '../types/engine'

function priceOf(c: EngineCourse): number {
  const p = c.price
  if (p == null) return 0
  if (typeof p === 'number') return p
  const n = Number.parseFloat(String(p))
  return Number.isFinite(n) ? n : 0
}

function lessonUnlocked(lesson: EngineLesson): boolean {
  if (typeof lesson.canAccess === 'boolean') return lesson.canAccess
  return Boolean(lesson.videoUrl || lesson.content)
}

/** URL embebible de YouTube (watch o youtu.be); suficiente para la mayoría de casos. */
function youtubeEmbedSrc(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl.trim())
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`
      const m = /^\/embed\/([^/?]+)/.exec(u.pathname)
      if (m?.[1]) return `https://www.youtube.com/embed/${encodeURIComponent(m[1])}`
    }
  } catch {
    return null
  }
  return null
}

function allLessonsCompleted(mods: EngineModule[]): boolean {
  if (mods.length === 0) return false
  for (const m of mods) {
    for (const l of m.lessons ?? []) {
      if (!l.completed) return false
    }
  }
  return true
}

export function CourseDetail() {
  const { courseId: rawId } = useParams<{ courseId: string }>()
  const courseId = Number.parseInt(rawId ?? '', 10)
  const { email } = useAuth()
  const { addItem, items } = useCart()
  const { enrollments, loading: enrollLoading } = useMyEngineEnrollments(email)
  const en = enrollmentForCourse(enrollments, courseId)

  const [course, setCourse] = useState<EngineCourse | null>(null)
  const [modules, setModules] = useState<EngineModule[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [courseCert, setCourseCert] = useState<Certificate | null>(null)
  const [completingLessonId, setCompletingLessonId] = useState<number | null>(null)
  const [progressToast, setProgressToast] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(courseId) || courseId < 1) {
      setError('Identificador de curso no válido')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    const [cRes, mRes] = await Promise.all([
      fetchEngineCourse(courseId),
      fetchEngineCourseModules(courseId, email),
    ])
    if (!cRes.ok) {
      setCourse(null)
      setModules([])
      setCourseCert(null)
      setError(cRes.message || 'No se pudo cargar el curso')
      setLoading(false)
      return
    }
    setCourse(cRes.data)
    if (!mRes.ok) {
      setModules([])
      setError(mRes.message || 'No se pudieron cargar los módulos')
    } else {
      setModules(mRes.data ?? [])
      setError(null)
    }
    if (email?.trim()) {
      const certs = await fetchStudentCertificates(email.trim())
      setCourseCert(certs.find((x) => x.courseId === String(courseId)) ?? null)
    } else {
      setCourseCert(null)
    }
    setLoading(false)
  }, [courseId, email, en?.status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!progressToast) return
    const t = window.setTimeout(() => setProgressToast(null), 9000)
    return () => window.clearTimeout(t)
  }, [progressToast])

  const markLessonComplete = useCallback(
    async (moduleId: number, lessonId: number) => {
      const em = email?.trim()
      if (!em) return
      setCompleteError(null)
      setCompletingLessonId(lessonId)
      const res = await completeEngineLesson(moduleId, lessonId, em)
      setCompletingLessonId(null)
      if (!res.ok) {
        setCompleteError(res.message)
        return
      }
      if (res.data.moduleCompleted) {
        const mt = res.data.moduleTitle?.trim()
        setProgressToast(mt ? `¡Módulo completado: ${mt}!` : '¡Módulo completado!')
      }
      await load()
    },
    [email, load],
  )

  const inCart = items.some((i) => i.courseId === courseId)
  const action = resolveCoursePurchaseAction(en, inCart)
  const price = course ? priceOf(course) : 0
  const showProgressTools = action.kind === 'active' && Boolean(email?.trim())
  const courseDoneLessons = allLessonsCompleted(modules)

  if (!Number.isFinite(courseId) || courseId < 1) {
    return (
      <div className="duo-page duo-fade-in narrow">
        <div className="duo-banner duo-banner-error">Curso no válido.</div>
        <Link to="/catalog" className="duo-btn duo-btn-sky" style={{ marginTop: '1rem' }}>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (loading && !course) {
    return (
      <div className="duo-page duo-fade-in">
        <div className="duo-loading">
          <div className="duo-spinner" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="duo-page duo-fade-in narrow">
        {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
        <Link to="/catalog" className="duo-btn duo-btn-sky" style={{ marginTop: '1rem' }}>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="duo-page duo-fade-in narrow duo-course-detail">
      <nav className="duo-course-detail-nav" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
        <Link to="/catalog" className="duo-muted small">
          ← Catálogo
        </Link>
        <Link to={`/forum/${courseId}`} className="duo-btn duo-btn-sky duo-btn small">
          Foro del curso
        </Link>
      </nav>

      <header className="duo-course-detail-head">
        <div>
          <div className="duo-pill duo-pill-rose">Curso</div>
          <h1 className="duo-title">{course.title}</h1>
          <p className="duo-subtitle">
            {course.description?.trim() ||
              'Programa con módulos y lecciones. Las bloqueadas requieren inscripción activa.'}
          </p>
          {course.instructor ? (
            <p className="duo-muted small" style={{ marginTop: '0.35rem' }}>
              Instructor: {course.instructor}
            </p>
          ) : null}
        </div>
        <div className="duo-course-detail-aside">
          {action.kind === 'active' ? (
            <div className="duo-access-badge duo-access-badge-ok">
              <span aria-hidden>✓</span> Inscripción activa — acceso completo
            </div>
          ) : action.kind === 'pending' ? (
            <div className="duo-access-badge duo-access-badge-warn">
              Inscripción pendiente de pago — <Link to="/cart">ir al carrito</Link>
            </div>
          ) : action.kind === 'other' ? (
            <div className="duo-access-badge duo-access-badge-warn">
              Ya tienes una inscripción ({action.status}). Las lecciones de muestra siguen disponibles.
            </div>
          ) : (
            <div className="duo-access-badge">Vista pública — desbloquea con inscripción activa</div>
          )}

          <div className="duo-course-detail-buy">
            <span className="duo-price" style={{ fontSize: '1.35rem' }}>
              {price > 0 ? `${price.toFixed(2)} €` : 'GRATIS'}
            </span>
            {enrollLoading ? (
              <span className="duo-muted small">Comprobando inscripción…</span>
            ) : action.kind === 'add' ? (
              <button
                type="button"
                className="duo-btn duo-btn-rose duo-btn-block"
                onClick={() =>
                  addItem({
                    courseId,
                    title: course.title ?? `Curso ${courseId}`,
                    price,
                    imageUrl: course.imageUrl,
                  })
                }
              >
                Añadir al carrito
              </button>
            ) : action.kind === 'in_cart' ? (
              <Link to="/cart" className="duo-btn duo-btn-ghost duo-btn-block">
                En el carrito — ver
              </Link>
            ) : action.kind === 'active' ? (
              <span className="duo-muted small" style={{ textAlign: 'center' }}>
                No hace falta comprar de nuevo.
              </span>
            ) : action.kind === 'pending' ? (
              <Link to="/checkout" className="duo-btn duo-btn-rose duo-btn-block">
                Completar pago
              </Link>
            ) : (
              <span className="duo-muted small" style={{ textAlign: 'center' }}>
                No puedes añadir otro igual al carrito.
              </span>
            )}
          </div>
        </div>
      </header>

      {error ? (
        <div className="duo-banner duo-banner-warn" role="status">
          {error}
        </div>
      ) : null}

      <section className="duo-curriculum" aria-labelledby="curriculum-heading">
        <h2 id="curriculum-heading" className="duo-profile-card-title" style={{ marginBottom: '0.5rem' }}>
          Programa: módulos y lecciones
        </h2>
        <p className="duo-muted small" style={{ marginBottom: '1.25rem' }}>
          Puedes pegar un enlace de <strong>YouTube</strong> en el campo vídeo de la lección (motor). Con inscripción
          activa marca cada lección como completada; al terminar un módulo verás un aviso. El certificado PDF lo emite{' '}
          <strong>learning-students</strong> cuando todos los módulos consten completos (vía RabbitMQ).
        </p>

        {showProgressTools && progressToast ? (
          <div className="duo-banner duo-banner-ok" role="status">
            {progressToast}
          </div>
        ) : null}
        {showProgressTools && completeError ? (
          <div className="duo-banner duo-banner-error" role="alert">
            {completeError}
          </div>
        ) : null}

        {modules.length === 0 ? (
          <div className="duo-empty">
            <p>No hay módulos publicados para este curso todavía.</p>
          </div>
        ) : (
          modules.map((mod) => (
            <article key={mod.id} className="duo-module-card">
              <h3 className="duo-module-title">
                {mod.title}
                {mod.orderIndex != null ? (
                  <span className="duo-lesson-meta" style={{ marginLeft: '0.5rem' }}>
                    · Módulo {mod.orderIndex}
                  </span>
                ) : null}
              </h3>
              {mod.description ? <p className="duo-muted small">{mod.description}</p> : null}
              <ul className="duo-lesson-list">
                {(mod.lessons ?? []).map((lesson) => {
                  const open = lessonUnlocked(lesson)
                  const yt = lesson.videoUrl ? youtubeEmbedSrc(lesson.videoUrl) : null
                  const done = Boolean(lesson.completed)
                  const busy = completingLessonId === lesson.id
                  return (
                    <li key={lesson.id}>
                      <div className={`duo-lesson-row ${open ? 'unlocked' : 'locked'}`}>
                        <span className="duo-lesson-meta" aria-hidden>
                          {done ? '✓' : open ? '▶' : '🔒'}
                        </span>
                        <div className="duo-lesson-body">
                          <p className="duo-lesson-title">{lesson.title}</p>
                          {lesson.durationMinutes != null ? (
                            <p className="duo-lesson-gate">{lesson.durationMinutes} min</p>
                          ) : null}
                          {!open ? (
                            <p className="duo-lesson-gate">
                              {action.kind === 'active'
                                ? 'Contenido no disponible (revisa la lección en el motor).'
                                : 'Bloqueada — activa tu inscripción para ver el contenido o usa una lección marcada como preview.'}
                            </p>
                          ) : null}
                          {open && lesson.videoUrl && yt ? (
                            <div className="duo-yt-embed-wrap">
                              <iframe
                                title={lesson.title}
                                src={yt}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                          {open && lesson.videoUrl ? (
                            <a
                              className="duo-btn duo-btn-sky small"
                              style={{ marginTop: '0.5rem', display: 'inline-flex' }}
                              href={lesson.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {yt ? 'Abrir en YouTube' : 'Abrir vídeo'}
                            </a>
                          ) : null}
                          {open && lesson.content ? (
                            <div
                              className="duo-lesson-content mono"
                              style={{
                                marginTop: '0.65rem',
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                color: '#334155',
                              }}
                            >
                              {lesson.content}
                            </div>
                          ) : null}
                          {showProgressTools && open ? (
                            done ? (
                              <span className="duo-lesson-done-badge" aria-label="Lección completada">
                                Hecho
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="duo-btn duo-btn-rose small"
                                style={{ marginTop: '0.65rem' }}
                                disabled={busy}
                                onClick={() => void markLessonComplete(mod.id, lesson.id)}
                              >
                                {busy ? 'Guardando…' : 'Marcar como completada'}
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
          ))
        )}

        {showProgressTools && courseCert ? (
          <div className="duo-cert-card">
            <h3 className="duo-profile-card-title" style={{ marginTop: 0 }}>
              Certificado del curso
            </h3>
            <p className="duo-muted small">
              Emitido el {new Date(courseCert.issuedAt).toLocaleString('es')}. Descarga el PDF y, si quieres imprimirlo,
              ábrelo y usa <strong>Ctrl+P</strong> (o el menú Imprimir del navegador).
            </p>
            <div className="duo-cert-actions">
              <button
                type="button"
                className="duo-btn duo-btn-rose"
                onClick={() => void downloadCertificatePdf(courseCert.id)}
              >
                Descargar PDF
              </button>
              <button type="button" className="duo-btn duo-btn-ghost" onClick={() => void load()}>
                Actualizar estado
              </button>
            </div>
          </div>
        ) : null}

        {showProgressTools && courseDoneLessons && !courseCert ? (
          <div className="duo-banner duo-banner-warn" role="status">
            <p style={{ margin: '0 0 0.75rem' }}>
              Has completado todas las lecciones visibles. El certificado aparece aquí cuando{' '}
              <strong>learning-students</strong> recibe el evento de último módulo (cola RabbitMQ). Si el servicio no
              está en marcha, el PDF no se generará.
            </p>
            <button type="button" className="duo-btn duo-btn-sky small" onClick={() => void load()}>
              Comprobar de nuevo
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
