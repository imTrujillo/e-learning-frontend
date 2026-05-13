import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { API_BASE } from '../config'
import { apiRequest, assetUrl, getStoredAccessToken, toStoredPicturePath } from '../lib/api'
import type { StudentProfile } from '../types/api'

export function Profile() {
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pictureUrl, setPictureUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [crmMsg, setCrmMsg] = useState<string | null>(null)
  const [imgKey, setImgKey] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiRequest<StudentProfile>('/api/profile')
      const s = res.data
      if (!s) return
      setStudent(s)
      setName(s.name)
      setLastName(s.lastName ?? '')
      setPictureUrl(toStoredPicturePath(s.profilePicture) ?? s.profilePicture ?? null)
      setImgKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setMessage(null)
    const fd = new FormData()
    fd.append('file', file)
    const token = getStoredAccessToken()
    try {
      const res = await fetch(`${API_BASE}/api/upload/profile-picture`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = (await res.json()) as { success: boolean; message: string; data: string | null }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Error al subir la imagen')
      }
      const normalized = toStoredPicturePath(json.data) ?? json.data
      setPictureUrl(normalized)
      setImgKey((k) => k + 1)
      setMessage('Imagen subida. Guarda el perfil para aplicar la foto.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      e.target.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await apiRequest<StudentProfile>('/api/profile', {
        method: 'PUT',
        body: {
          name,
          lastName,
          profilePicture: toStoredPicturePath(pictureUrl),
        },
      })
      if (res.data) {
        setStudent(res.data)
        setPictureUrl(toStoredPicturePath(res.data.profilePicture) ?? res.data.profilePicture ?? null)
        setImgKey((k) => k + 1)
      }
      setMessage(res.message || 'Perfil actualizado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  async function syncCrm() {
    setCrmMsg(null)
    setError(null)
    try {
      const res = await apiRequest<null>('/api/crm/sync', { method: 'POST' })
      setCrmMsg(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    }
  }

  if (!student && !error) {
    return (
      <div className="duo-page duo-fade-in">
        <div className="duo-loading">
          <div className="duo-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="duo-page duo-fade-in narrow duo-profile-page">
      <header className="duo-profile-hero">
        <div className="duo-pill duo-pill-rose">Perfil</div>
        <h1 className="duo-title">Tu cuenta</h1>
        <p className="duo-profile-lede">
          Nombre, apellido y foto visible en el panel. La imagen se sirve desde <code>/uploads</code> (en
          desarrollo pasa por el proxy de Vite).
        </p>
      </header>

      <div className="duo-profile-banners">
        {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}
        {message ? <div className="duo-banner duo-banner-ok">{message}</div> : null}
        {crmMsg ? <div className="duo-banner duo-banner-info">{crmMsg}</div> : null}
      </div>

      <div className="duo-profile-grid">
        <section className="duo-profile-photo-card duo-delay-1" aria-labelledby="profile-photo-heading">
          <h2 id="profile-photo-heading" className="duo-profile-card-title">
            Foto
          </h2>
          <div className="duo-profile-avatar-ring">
            <div className="duo-profile-avatar-inner">
              {pictureUrl ? (
                <img
                  className="duo-profile-avatar-img"
                  src={`${assetUrl(pictureUrl)}?v=${imgKey}`}
                  alt="Foto de perfil"
                  loading="lazy"
                />
              ) : (
                <div className="duo-profile-avatar-placeholder" aria-hidden>
                  👤
                </div>
              )}
            </div>
          </div>
          <div className="duo-profile-photo-actions">
            <label className="duo-btn duo-btn-ghost small">
              Subir imagen
              <input type="file" accept="image/*" hidden onChange={onUpload} />
            </label>
            <p className="duo-profile-hint">
              Tras subir, pulsa <strong>Guardar</strong>. Puedes pegar una ruta como{' '}
              <code>/uploads/archivo.jpg</code>.
            </p>
          </div>
        </section>

        <section className="duo-profile-form-card duo-delay-2" aria-labelledby="profile-data-heading">
          <h2 id="profile-data-heading" className="duo-profile-card-title">
            Datos
          </h2>
          <form className="form" onSubmit={onSubmit}>
            <label className="duo-label">
              Nombre
              <input className="duo-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="duo-label">
              Apellido
              <input
                className="duo-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
            <label className="duo-label">
              Correo
              <input className="duo-input" value={student?.email ?? ''} disabled style={{ opacity: 0.75 }} />
            </label>
            <label className="duo-label">
              Ruta o URL de foto (opcional)
              <input
                className="duo-input mono"
                value={pictureUrl ?? ''}
                onChange={(e) => setPictureUrl(e.target.value || null)}
                placeholder="/uploads/archivo.png"
                spellCheck={false}
              />
            </label>
            <div className="row gap wrap">
              <button type="submit" className="duo-btn duo-btn-rose" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button type="button" className="duo-btn duo-btn-sky" onClick={() => void syncCrm()}>
                Sincronizar con EspoCRM
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
