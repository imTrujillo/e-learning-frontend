import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fetchEngineCategories, fetchEngineCourses } from '../lib/engineApi'
import type { EngineCategory, EngineCourse } from '../types/engine'

function priceOf(c: EngineCourse): number {
  const p = c.price
  if (p == null) return 0
  if (typeof p === 'number') return p
  const n = Number.parseFloat(String(p))
  return Number.isFinite(n) ? n : 0
}

export function Catalog() {
  const { addItem, items } = useCart()
  const [courses, setCourses] = useState<EngineCourse[]>([])
  const [categories, setCategories] = useState<EngineCategory[]>([])
  const [catError, setCatError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categorySlug, setCategorySlug] = useState('')

  const loadCategories = useCallback(async () => {
    setCatError('')
    const res = await fetchEngineCategories(0, 80)
    if (!res.ok) {
      setCategories([])
      setCatError(
        'Las categorías no están disponibles. Puedes seguir explorando todo el catálogo desde el motor.',
      )
      return
    }
    setCategories(res.data.content ?? [])
  }, [])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    const res = await fetchEngineCourses(0, 60, categorySlug || undefined)
    if (!res.ok) {
      setCourses([])
    } else {
      setCourses(res.data.content ?? [])
    }
    setLoading(false)
  }, [categorySlug])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

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

      {loading ? (
        <div className="duo-loading">
          <div className="duo-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="duo-empty">
          <p>No se encontraron cursos. ¿Está learning-engine en marcha con datos?</p>
        </div>
      ) : (
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
                    <span className="duo-rating" aria-hidden>
                      ★ 4.8
                    </span>
                  </div>
                  <h2 className="duo-course-title">{course.title}</h2>
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
                  {inCart(id) ? (
                    <span className="duo-in-cart">En el carrito</span>
                  ) : (
                    <button
                      type="button"
                      className="duo-btn duo-btn-rose duo-btn-block"
                      onClick={() =>
                        addItem({
                          courseId: id,
                          title: course.title ?? `Curso ${id}`,
                          price,
                          imageUrl: course.imageUrl,
                        })
                      }
                    >
                      Añadir al carrito
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
