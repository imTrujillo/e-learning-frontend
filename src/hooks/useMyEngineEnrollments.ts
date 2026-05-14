import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEngineMyCourses } from '../lib/engineApi'
import type { EngineEnrollment } from '../types/engine'

export function useMyEngineEnrollments(email: string | null) {
  const [list, setList] = useState<EngineEnrollment[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!email) {
      setList([])
      return
    }
    setLoading(true)
    const res = await fetchEngineMyCourses(email)
    setLoading(false)
    if (res.ok) setList(Array.isArray(res.data) ? res.data : [])
    else setList([])
  }, [email])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const activeCourseIds = useMemo(() => {
    const s = new Set<number>()
    for (const e of list) {
      if (e.status === 'ACTIVE' && typeof e.course?.id === 'number') s.add(e.course.id)
    }
    return s
  }, [list])

  return { enrollments: list, activeCourseIds, loading, refresh }
}
