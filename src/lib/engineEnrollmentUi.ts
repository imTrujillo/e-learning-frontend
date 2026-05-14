import type { EngineEnrollment } from '../types/engine'

export function enrollmentForCourse(
  enrollments: EngineEnrollment[],
  courseId: number,
): EngineEnrollment | undefined {
  return enrollments.find((e) => e.course?.id === courseId)
}

export type CoursePurchaseAction =
  | { kind: 'add' }
  | { kind: 'in_cart' }
  | { kind: 'active' }
  | { kind: 'pending' }
  | { kind: 'other'; status: string }

/** Decide CTA del catálogo / ficha sin permitir recomprar con inscripción activa u otra ya creada. */
export function resolveCoursePurchaseAction(
  en: EngineEnrollment | undefined,
  inCart: boolean,
): CoursePurchaseAction {
  if (en?.status === 'ACTIVE') return { kind: 'active' }
  if (en?.status === 'PENDING_PAYMENT') return { kind: 'pending' }
  if (en) return { kind: 'other', status: String(en.status) }
  return inCart ? { kind: 'in_cart' } : { kind: 'add' }
}
