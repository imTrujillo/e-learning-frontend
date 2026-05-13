/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** learning-engine API base en producción (incluye `/api`, sin barra final). */
  readonly VITE_ENGINE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
