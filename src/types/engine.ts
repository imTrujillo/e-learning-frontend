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

/** Estados de inscripción en learning-engine (enum Java). */
export type EngineEnrollmentStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SUSPENDED'

export type EngineEnrollment = {
  id: number
  status: EngineEnrollmentStatus | string
  course?: Pick<EngineCourse, 'id' | 'title' | 'slug' | 'imageUrl'> | null
}

export type EngineLesson = {
  id: number
  title: string
  content?: string | null
  videoUrl?: string | null
  durationMinutes?: number | null
  orderIndex?: number | null
  freePreview?: boolean | null
  completed?: boolean | null
  /** Si el motor permite ver contenido/vídeo (inscripción activa o lección de muestra). */
  canAccess?: boolean | null
}

export type EngineModule = {
  id: number
  title: string
  description?: string | null
  orderIndex?: number | null
  lessons: EngineLesson[]
}

export type EngineLessonProgressResponse = {
  lessonId: number
  lessonTitle: string
  completed?: boolean | null
  completedAt?: string | null
  moduleCompleted?: boolean | null
  moduleTitle?: string | null
}

export type EngineErrorBody = {
  message?: string
  error?: string
  status?: number
}
