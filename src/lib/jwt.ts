function decodePayload(token: string): { sub?: string; exp?: number } | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as { sub?: string; exp?: number }
  } catch {
    return null
  }
}

export function decodeJwtSubject(token: string): string | null {
  return decodePayload(token)?.sub ?? null
}

/** True if missing, malformed, or exp is in the past (leeway 10s). */
export function isAccessTokenExpired(token: string | null): boolean {
  if (!token) return true
  const payload = decodePayload(token)
  if (!payload || typeof payload.exp !== 'number') return false
  return payload.exp * 1000 <= Date.now() + 10_000
}
