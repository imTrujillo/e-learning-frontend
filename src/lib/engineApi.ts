import { ENGINE_API_BASE } from '../config'
import type {
  EngineCategory,
  EngineCourse,
  EngineErrorBody,
  EnginePaged,
  LearningEngineResponse,
} from '../types/engine'

function joinBase(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${ENGINE_API_BASE}${p}`
}

async function readJson(res: Response): Promise<unknown> {
  const t = await res.text()
  if (!t) return null
  try {
    return JSON.parse(t) as unknown
  } catch {
    return { message: t }
  }
}

function isLearningEnvelope(v: unknown): v is LearningEngineResponse<unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    'success' in v &&
    typeof (v as LearningEngineResponse<unknown>).success === 'boolean'
  )
}

export type EngineResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

export async function engineRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<EngineResult<T>> {
  const url = joinBase(path)
  const headers = new Headers(init?.headers)
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers,
    })
  } catch (e) {
    const hint =
      import.meta.env.DEV
        ? ' ¿Está learning-engine en marcha (puerto 8081) y el proxy /engine-api configurado?'
        : ''
    return {
      ok: false,
      status: 0,
      message:
        e instanceof Error
          ? (e.message === 'Failed to fetch' ? `No se pudo conectar con el motor de cursos.${hint}` : e.message)
          : 'Error de red',
    }
  }

  const body = await readJson(res)

  if (res.ok && isLearningEnvelope(body) && body.success) {
    return { ok: true, data: body.data as T }
  }

  let message = res.statusText
  if (isLearningEnvelope(body) && !body.success) {
    message = body.message || message
  } else if (body && typeof body === 'object' && 'message' in body) {
    message = String((body as EngineErrorBody).message || message)
  }

  return { ok: false, status: res.status, message }
}

export async function fetchEngineCourses(
  page: number,
  size: number,
  categorySlug?: string,
): Promise<EngineResult<EnginePaged<EngineCourse>>> {
  const q = new URLSearchParams({ page: String(page), size: String(size) })
  if (categorySlug) q.set('category', categorySlug)
  return engineRequest<EnginePaged<EngineCourse>>(`/courses?${q.toString()}`)
}

export async function fetchEngineCategories(
  page = 0,
  size = 50,
): Promise<EngineResult<EnginePaged<EngineCategory>>> {
  const q = new URLSearchParams({ page: String(page), size: String(size) })
  return engineRequest<EnginePaged<EngineCategory>>(`/categories?${q.toString()}`)
}

/** Registra al estudiante en learning-engine (necesario antes de crear inscripción). Ignora email duplicado. */
export async function ensureEngineStudent(email: string): Promise<EngineResult<unknown>> {
  const local = email.split('@')[0]?.trim() || 'Estudiante'
  const res = await fetch(joinBase('/students'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: local,
      lastName: 'Learner',
      email,
      phone: null,
    }),
  })
  const body = await readJson(res)
  if (res.ok && isLearningEnvelope(body) && body.success) {
    return { ok: true, data: body.data }
  }
  const msg = String(
    (body && typeof body === 'object' && 'message' in body && (body as EngineErrorBody).message) ||
      (isLearningEnvelope(body) ? body.message : '') ||
      res.statusText,
  )
  if (msg.includes('Ya existe')) {
    return { ok: true, data: null }
  }
  return { ok: false, status: res.status, message: msg }
}

export async function createEngineEnrollment(
  courseId: number,
  studentEmail: string,
): Promise<EngineResult<unknown>> {
  return engineRequest('/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, studentEmail }),
  })
}

export async function activateEngineEnrollment(
  customerEmail: string,
  courseId: number,
): Promise<EngineResult<unknown>> {
  const q = new URLSearchParams({
    customerEmail,
    courseId: String(courseId),
  })
  return engineRequest(`/woocommerce/activate?${q.toString()}`, { method: 'POST' })
}
