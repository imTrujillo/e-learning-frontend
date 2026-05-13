export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export type CourseProgress = {
  courseId: string
  courseName: string
  progress: number
  totalModules: number
  completed: boolean
}

export type AvailableCourse = {
  courseId: string
  title: string
  description: string
  instructor: string
  imageUrl: string
  price: number
  totalModules: number
  totalLessons: number
  enrolled: boolean
}

export type DashboardData = {
  name: string
  email: string
  enrolledCourses: CourseProgress[]
  availableCourses: AvailableCourse[]
  totalCertificates: number
}

export type StudentProfile = {
  id: string
  name: string
  lastName: string
  email: string
  profilePicture?: string | null
  enabled?: boolean
}

export type ForumMessage = {
  id: string
  courseId: string
  studentEmail: string
  studentName: string | null
  content: string
  sentAt: string
}

export type SpringPage<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type Certificate = {
  id: string
  studentEmail: string
  courseId: string
  courseName: string
  issuedAt: string
  sent: boolean
}
