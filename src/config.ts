/**
 * En `npm run dev`, las rutas son relativas (/api/...) y Vite las reenvía a learning-students
 * (vite.config.ts → por defecto localhost:8083; Docker del servicio a veces usa 8081 → VITE_PROXY_TARGET).
 * En `npm run build` / `preview`, usa VITE_API_URL (por defecto http://localhost:8083).
 */
const prodBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:8083').replace(/\/$/, '')

export const API_BASE = import.meta.env.DEV ? '' : prodBase

/** WebSocket / SockJS: mismo origen en dev (proxy), en prod igual que API. */
export const WS_BASE = API_BASE

const engineProd = (import.meta.env.VITE_ENGINE_URL ?? 'http://localhost:8081/api').replace(/\/$/, '')
/** Base URL hacia learning-engine: en dev `/engine-api` (proxy Vite → `/api`), en prod URL absoluta con `/api`. */
export const ENGINE_API_BASE = import.meta.env.DEV ? '/engine-api' : engineProd
