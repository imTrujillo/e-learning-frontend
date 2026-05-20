import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useMyEngineEnrollments } from '../hooks/useMyEngineEnrollments'
import { EnginePagination } from '../components/EnginePagination'
import { fetchEngineCategories, fetchEngineCourses } from '../lib/engineApi'
import { enrollmentForCourse, resolveCoursePurchaseAction } from '../lib/engineEnrollmentUi'
import type { EngineCategory, EngineCourse } from '../types/engine'

const COURSE_PAGE_SIZE = 12
const CATEGORY_PAGE_SIZE = 100

function priceOf(c: EngineCourse): number {
  const p = c.price
  if (p == null) return 0
  if (typeof p === 'number') return p
  const n = Number.parseFloat(String(p))
  return Number.isFinite(n) ? n : 0
}

export function Catalog() {
  const { email } = useAuth()
  const { addItem, items } = useCart()
  const { enrollments, loading: enrollLoading } = useMyEngineEnrollments(email)
  const [courses, setCourses] = useState<EngineCourse[]>([])
  const [categories, setCategories] = useState<EngineCategory[]>([])
  const [catError, setCatError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const loadCategories = useCallback(async () => {
    setCatError('')
    const all: EngineCategory[] = []
    let p = 0
    let pages = 1
    while (p < pages) {
      const res = await fetchEngineCategories(p, CATEGORY_PAGE_SIZE)
      if (!res.ok) {
        setCategories([])
        setCatError(
          'Las categorías no están disponibles. Puedes seguir explorando todo el catálogo desde el motor.',
        )
        return
      }
      all.push(...(res.data.content ?? []))
      pages = res.data.totalPages ?? 1
      p += 1
    }
    setCategories(all)
  }, [])

  const loadCourses = useCallback(async (pageIndex: number, slug: string) => {
    setLoading(true)
    const res = await fetchEngineCourses(pageIndex, COURSE_PAGE_SIZE, slug || undefined)
    if (!res.ok) {
      setCourses([])
      setTotalPages(0)
      setTotalItems(0)
    } else {
      setCourses(res.data.content ?? [])
      setTotalPages(res.data.totalPages ?? 0)
      setTotalItems(res.data.totalItems ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    setPage(0)
  }, [categorySlug])

  useEffect(() => {
    void loadCourses(page, categorySlug)
  }, [loadCourses, page, categorySlug])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return courses
    return courses.filter((c) => {
      const title = (c.title ?? '').toLowerCase()
      const desc = (c.description ?? '').toLowerCase()
      const cat = (c.category?.name ?? '').toLowerCase()
      return title.includes(t) || desc.includes(t) || cat.includes(t)
    })
  }, [courses, search])

  const inCart = useCallback((id: number) => items.some((i) => i.courseId === id), [items])

  const purchaseBlock = (courseId: number, title: string, price: number, imageUrl?: string | null) => {
    const en = enrollmentForCourse(enrollments, courseId)
    const action = resolveCoursePurchaseAction(en, inCart(courseId))
    if (enrollLoading) {
      return <span className="duo-muted small">Comprobando inscripción…</span>
    }
    if (action.kind === 'active') {
      return (
        <div className="duo-catalog-purchase-stack">
          <span className="duo-in-cart" style={{ color: '#047857' }}>
            Ya tienes acceso
          </span>
          <Link to={`/catalog/${courseId}`} className="duo-btn duo-btn-sky duo-btn-block">
            Ver programa
          </Link>
        </div>
      )
    }
    if (action.kind === 'pending') {
      return (
        <div className="duo-catalog-purchase-stack">
          <span className="duo-in-cart">Pago pendiente</span>
          <Link to="/checkout" className="duo-btn duo-btn-rose duo-btn-block">
            Completar pago
          </Link>
          <Link to={`/catalog/${courseId}`} className="duo-btn duo-btn-ghost duo-btn-block small">
            Ver programa
          </Link>
        </div>
      )
    }
    if (action.kind === 'other') {
      return (
        <div className="duo-catalog-purchase-stack">
          <span className="duo-muted small">Inscripción: {action.status}</span>
          <Link to={`/catalog/${courseId}`} className="duo-btn duo-btn-ghost duo-btn-block">
            Ver programa
          </Link>
        </div>
      )
    }
    if (action.kind === 'in_cart') {
      return (
        <div className="duo-catalog-purchase-stack">
          <span className="duo-in-cart">En el carrito</span>
          <Link to={`/catalog/${courseId}`} className="duo-btn duo-btn-ghost duo-btn-block small">
            Ver programa
          </Link>
        </div>
      )
    }
    return (
      <div className="duo-catalog-purchase-stack">
        <button
          type="button"
          className="duo-btn duo-btn-rose duo-btn-block"
          onClick={() =>
            addItem({
              courseId,
              title,
              price,
              imageUrl,
            })
          }
        >
          Añadir al carrito
        </button>
        <Link to={`/catalog/${courseId}`} className="duo-btn duo-btn-ghost duo-btn-block small">
          Ver programa
        </Link>
      </div>
    )
  }

  return (
    <div className="duo-page duo-fade-in">
      <div className="duo-catalog-head">
        <div>
          <div className="duo-pill duo-pill-rose">
            <span aria-hidden>📚</span> Catálogo
          </div>
          <h1 className="duo-title">Comienza a explorar</h1>
          <p className="duo-subtitle">
            Cursos desde el motor de aprendizaje. Añade al carrito y simula el pago para activar tu
            inscripción.
          </p>
        </div>
        <Link to="/cart" className="duo-btn duo-btn-rose">
          Ver carrito ({items.length})
        </Link>
      </div>

      {catError ? (
        <div className="duo-banner duo-banner-warn" role="status">
          {catError}
        </div>
      ) : null}

      <div className="duo-toolbar">
        <div className="duo-search-wrap">
          <span className="duo-search-icon" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            className="duo-input duo-search-input"
            placeholder="Buscar cursos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar en el catálogo"
          />
        </div>
        <select
          className="duo-input duo-select"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {search.trim() ? (
        <p className="duo-muted small" style={{ marginBottom: '0.75rem' }}>
          La búsqueda filtra los cursos de esta página ({courses.length} en pantalla).
        </p>
      ) : null}

      {loading ? (
        <div className="duo-loading">
          <div className="duo-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="duo-empty">
          <p>No se encontraron cursos. ¿Está learning-engine en marcha con datos?</p>
        </div>
      ) : (
        <>
        <div className="duo-course-grid">
          {filtered.map((course) => {
            const price = priceOf(course)
            const id = course.id
            return (
              <article key={id} className="duo-course-card">
                <div className="duo-course-media">
                  {course.imageUrl ? (
                    <img src={course.imageUrl} alt="" className="duo-course-img" loading="lazy" />
                  ) : (
                    <div className="duo-course-placeholder">
                      <span>{(course.title ?? 'CUR').slice(0, 3).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="duo-course-body">
                  <div className="duo-course-meta">
                    <span className="duo-chip">{course.category?.name ?? 'General'}</span>
                  </div>
                  <h2 className="duo-course-title">
                    <Link to={`/catalog/${id}`}>{course.title}</Link>
                  </h2>
                  <p className="duo-course-desc">
                    {course.description?.trim() ||
                      'Descubre este curso y avanza módulo a módulo.'}
                  </p>
                  <div className="duo-course-footer">
                    <span className="duo-mod-chip">
                      {course.totalModules ? `${course.totalModules} módulos` : '—'}
                    </span>
                    <span className="duo-price">{price > 0 ? `${price.toFixed(2)} €` : 'GRATIS'}</span>
                  </div>
                  {purchaseBlock(id, course.title ?? `Curso ${id}`, price, course.imageUrl)}
                </div>
              </article>
            )
          })}
        </div>
        <EnginePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={COURSE_PAGE_SIZE}
          disabled={loading}
          onPageChange={setPage}
        />
        </>
      )}

    </div>
  )
}
