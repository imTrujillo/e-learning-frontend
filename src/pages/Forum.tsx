import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_BASE, WS_BASE } from '../config'
import { apiRequest, getStoredAccessToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { ForumMessage, SpringPage, StudentProfile } from '../types/api'

function mergeById(existing: ForumMessage[], incoming: ForumMessage[]): ForumMessage[] {
  const map = new Map<string, ForumMessage>()
  for (const m of existing) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  )
}

export function Forum() {
  const { courseId = '' } = useParams()
  const { email } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wsState, setWsState] = useState<'off' | 'connecting' | 'live'>('off')
  const clientRef = useRef<Client | null>(null)

  const displayName = useMemo(() => {
    if (!profile) return email ?? 'Estudiante'
    return [profile.name, profile.lastName].filter(Boolean).join(' ').trim() || email || 'Estudiante'
  }, [profile, email])

  const loadHistory = useCallback(async () => {
    if (!courseId) return
    setError(null)
    try {
      const token = getStoredAccessToken()
      const res = await fetch(
        `${API_BASE}/api/courses/${encodeURIComponent(courseId)}/forum?page=0&size=100`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      if (!res.ok) throw new Error('No se pudo cargar el foro')
      const page = (await res.json()) as SpringPage<ForumMessage>
      setMessages(page.content ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar mensajes')
    }
  }, [courseId])

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiRequest<StudentProfile>('/api/profile')
        if (res.data) setProfile(res.data)
      } catch {
        /* perfil opcional para nombre */
      }
    })()
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (!courseId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE}/ws`) as unknown as WebSocket,
      reconnectDelay: 4000,
      onConnect: () => {
        setWsState('live')
        client.subscribe(`/topic/course/${courseId}/forum`, (frame) => {
          try {
            const body = JSON.parse(frame.body) as ForumMessage
            setMessages((prev) => mergeById(prev, [body]))
          } catch {
            /* ignore */
          }
        })
      },
      onStompError: () => setError('Error en el canal en vivo del foro'),
      onWebSocketClose: () => setWsState('off'),
    })

    setWsState('connecting')
    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      clientRef.current = null
    }
  }, [courseId])

  async function sendRest(e: FormEvent) {
    e.preventDefault()
    if (!courseId || !content.trim()) return
    setError(null)
    try {
      const token = getStoredAccessToken()
      const res = await fetch(`${API_BASE}/api/courses/${encodeURIComponent(courseId)}/forum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId, content: content.trim() }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'No se pudo publicar')
      }
      const saved = (await res.json()) as ForumMessage
      setMessages((prev) => mergeById(prev, [saved]))
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar')
    }
  }

  function sendWs() {
    const client = clientRef.current
    if (!client?.connected || !courseId || !content.trim()) return
    const payload = {
      courseId,
      content: content.trim(),
      studentEmail: email ?? '',
      studentName: displayName,
    }
    client.publish({
      destination: `/app/forum/${courseId}`,
      body: JSON.stringify(payload),
    })
    setContent('')
  }

  return (
    <div className="duo-page duo-fade-in forum-page">
      <div className="row between wrap">
        <div>
          <div className="duo-pill duo-pill-sky">Foro del curso</div>
          <h1 className="duo-title">{courseId}</h1>
          <p className="muted small">
            Canal en vivo:{' '}
            {wsState === 'live' ? <span className="badge ok">Conectado</span> : null}
            {wsState === 'connecting' ? <span className="badge">Conectando…</span> : null}
            {wsState === 'off' ? <span className="badge muted">Sin enlace WS</span> : null}
          </p>
        </div>
        <Link to="/dashboard" className="duo-btn duo-btn-ghost small">
          Volver al panel
        </Link>
      </div>

      {error ? <div className="duo-banner duo-banner-error">{error}</div> : null}

      <div className="card forum-feed">
        <ul className="forum-list">
          {messages.map((m) => (
            <li key={m.id} className="forum-msg">
              <div className="forum-meta">
                <strong>{m.studentName || m.studentEmail}</strong>
                <span className="muted small">{new Date(m.sentAt).toLocaleString()}</span>
              </div>
              <p>{m.content}</p>
            </li>
          ))}
        </ul>
      </div>

      <form className="card forum-compose" onSubmit={sendRest}>
        <label>
          <p>Mensaje (REST — queda guardado; el tiempo real vía WS lo usa otro cliente)</p>
          <textarea 
          className='duo-input duo-input-textarea'
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un mensaje…"
          />
        </label>
        <div className="row gap wrap">
          <button type="submit" className="duo-btn duo-btn-rose">
            Publicar (REST)
          </button>
          <button
            type="button"
            className="duo-btn duo-btn-sky"
            onClick={sendWs}
            disabled={wsState !== 'live' || !content.trim()}
          >
            Enviar por WebSocket
          </button>
        </div>
      </form>
    </div>
  )
}
