import { API_BASE } from '../config'
import type { ApiResponse, Certificate } from '../types/api'

const ACCESS_KEY = 'ss_access_token'
const REFRESH_KEY = 'ss_refresh_token'

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setStoredTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Solo quita el access token (p. ej. caducado) y conserva el refresh para renovar en silencio. */
export function clearAccessTokenOnly() {
  localStorage.removeItem(ACCESS_KEY)
}

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text()
  if (!text) {
    return { success: res.ok, message: res.statusText, data: null as T }
  }
  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    throw new Error(text || 'Respuesta no válida del servidor')
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getStoredRefreshToken()
  if (!refresh) return null
  const url = `${API_BASE}/api/auth/refresh?refreshToken=${encodeURIComponent(refresh)}`
  const res = await fetch(url, { method: 'POST' })
  const body = await parseApiResponse<string>(res)
  if (!res.ok || !body.success || !body.data) {
    clearStoredTokens()
    return null
  }
  localStorage.setItem(ACCESS_KEY, body.data)
  return body.data
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, skipAuth, headers: hdrs, ...rest } = options
  const headers = new Headers(hdrs)

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getStoredAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const init: RequestInit = {
    ...rest,
    headers,
    body:
      body === undefined || body instanceof FormData
        ? (body as BodyInit | undefined)
        : JSON.stringify(body),
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    const hint =
      import.meta.env.DEV &&
      url.includes('/api/') &&
      typeof window !== 'undefined'
        ? ' ¿Está learning-students en marcha? (por defecto :8083; proxy en vite.config.ts). learning-engine va en :8081 y no sirve /api/auth.'
      : ''
    throw new Error(
      e instanceof Error
        ? `${e.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' + hint : e.message}`
        : 'Error de red',
    )
  }

  // Spring Security suele devolver 403 además de 401 cuando el JWT falta o no establece autenticación.
  if ((res.status === 401 || res.status === 403) && !skipAuth && getStoredRefreshToken()) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      const retryHeaders = new Headers(init.headers)
      retryHeaders.set('Authorization', `Bearer ${newAccess}`)
      res = await fetch(url, { ...init, headers: retryHeaders })
    }
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    const devHint =
      import.meta.env.DEV
        ? ' En desarrollo, el proxy de Vite reenvía a learning-students (por defecto http://localhost:8083; ver VITE_PROXY_TARGET). Arranca ese servicio y MySQL (p. ej. puerto 3308).'
        : ' El servicio API no está disponible.'
    throw new Error(
      `Bad Gateway (${res.status}): no hay backend escuchando o no responde.${devHint}`,
    )
  }

  const parsed = await parseApiResponse<T>(res)
  if (!res.ok) {
    const err = new Error(parsed.message || res.statusText)
    ;(err as Error & { status?: number; body?: ApiResponse<T> }).status = res.status
    ;(err as Error & { body?: ApiResponse<T> }).body = parsed
    throw err
  }
  return parsed
}

export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  let p = path.replace(/\\/g, '/').trim()
  // Si el backend guardó URL absoluta (p. ej. http://localhost:8083/uploads/...), usar solo path
  // para que en dev la petición vaya al mismo origen (Vite → proxy /uploads).
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p)
      p = u.pathname + u.search
    } catch {
      return p
    }
  }
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/{2,}/g, '/')
  const base = API_BASE.replace(/\/$/, '')
  return base ? `${base}${p}` : p
}

/** Ruta estable para guardar en API: siempre `/uploads/...` si es posible. */
export function toStoredPicturePath(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined
  let p = path.trim().replace(/\\/g, '/')
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname
    } catch {
      return p
    }
  }
  if (!p.startsWith('/')) p = `/${p}`
  return p.replace(/\/{2,}/g, '/')
}

export async function fetchStudentCertificates(studentEmail: string): Promise<Certificate[]> {
  const token = getStoredAccessToken()
  const res = await fetch(
    `${API_BASE}/api/certificates/${encodeURIComponent(studentEmail)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  )
  if (!res.ok) return []
  try {
    const data = (await res.json()) as unknown
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function downloadCertificatePdf(certificateId: string): Promise<void> {
  const token = getStoredAccessToken()
  const res = await fetch(
    `${API_BASE}/api/certificates/${encodeURIComponent(certificateId)}/download`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  )
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(
        'El servidor API no responde (502/503). Arranca el backend Java y vuelve a intentarlo.',
      )
    }
    throw new Error('No se pudo descargar el certificado')
  }
  const blob = await res.blob()
  const dispo = res.headers.get('Content-Disposition')
  let filename = 'certificado.pdf'
  if (dispo) {
    const m = /filename="?([^";]+)"?/i.exec(dispo)
    if (m) filename = m[1]
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
