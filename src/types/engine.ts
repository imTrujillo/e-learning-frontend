/** Respuesta envuelta del learning-engine (Java `LearningApiResponse`). */
export type LearningEngineResponse<T> = {
  success: boolean
  message: string
  data: T
  timestamp?: string
}

export type EnginePaged<T> = {
  content: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  first?: boolean
  last?: boolean
  empty?: boolean
}

export type EngineCategory = {
  id: number
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  totalCourses?: number | null
}

export type EngineCourse = {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  instructor?: string | null
  category?: { id: number; name: string; slug: string } | null
  slug?: string | null
  price?: number | string | null
  totalModules?: number | null
  totalLessons?: number | null
  active?: boolean | null
}

export type EngineErrorBody = {
  message?: string
  error?: string
  status?: number
}
