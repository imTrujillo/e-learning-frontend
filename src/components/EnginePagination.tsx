type EnginePaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

export function EnginePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  disabled,
  onPageChange,
}: EnginePaginationProps) {
  if (totalPages <= 1) return null

  const from = totalItems === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalItems)

  return (
    <nav className="duo-pagination" aria-label="Paginación">
      <p className="duo-pagination-meta">
        Mostrando {from}–{to} de {totalItems}
      </p>
      <div className="duo-pagination-actions">
        <button
          type="button"
          className="duo-btn duo-btn-ghost"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span className="duo-pagination-current">
          Página {page + 1} de {totalPages}
        </span>
        <button
          type="button"
          className="duo-btn duo-btn-ghost"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
