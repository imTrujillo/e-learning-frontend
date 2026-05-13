import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CartItem = {
  courseId: number
  title: string
  price: number
  imageUrl?: string | null
}

const STORAGE_KEY = 'eduquest_cart'

function loadCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is CartItem =>
        x &&
        typeof x === 'object' &&
        typeof (x as CartItem).courseId === 'number' &&
        typeof (x as CartItem).title === 'string' &&
        typeof (x as CartItem).price === 'number',
    )
  } catch {
    return []
  }
}

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (courseId: number) => void
  clear: () => void
  count: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

function persist(items: CartItem[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.courseId === item.courseId)) return prev
      const next = [...prev, item]
      persist(next)
      return next
    })
  }, [])

  const removeItem = useCallback((courseId: number) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.courseId !== courseId)
      persist(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    persist([])
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      clear,
      count: items.length,
      total: items.reduce((s, i) => s + (Number.isFinite(i.price) ? i.price : 0), 0),
    }),
    [items, addItem, removeItem, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
