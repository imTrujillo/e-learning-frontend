import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
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

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function formatMessageTimestamp(sentAt: string): string {
  const date = new Date(sentAt)
  if (Number.isNaN(date.getTime())) return sentAt
  return date.toLocaleString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Forum() {
  const { courseId = '' } = useParams()
  const { email } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wsState, setWsState] = useState<'off' | 'connecting' | 'live'>('off')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [sending, setSending] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const displayName = useMemo(() => {
    if (!profile) return email ?? 'Estudiante'
    return [profile.name, profile.lastName].filter(Boolean).join(' ').trim() || email || 'Estudiante'
  }, [profile, email])

  const currentUserEmail = useMemo(
    () => normalizeEmail(email ?? profile?.email),
    [email, profile?.email],
  )

  const loadHistory = useCallback(async () => {
    if (!courseId) return
    setError(null)
    try {
      const token = getStoredAccessToken()
      const res = await fetch(
        `${API_BASE}/api/courses/${encodeURIComponent(courseId)}/forum?page=0&size=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      if (!res.ok) throw new Error('No se pudo cargar el foro')
      const page = (await res.json()) as SpringPage<ForumMessage>
      setMessages(page.content ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar mensajes')
    }
  }, [courseId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  async function sendRest() {
    if (!courseId || !content.trim()) return
    setSending(true)
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
    } finally {
      setSending(false)
    }
  }

  function sendWs() {
    const client = clientRef.current
    if (!client?.connected || !courseId || !content.trim()) return
    client.publish({
      destination: `/app/forum/${courseId}`,
      body: JSON.stringify({
        courseId,
        content: content.trim(),
        studentEmail: currentUserEmail || email || '',
        studentName: displayName,
      }),
    })
    setContent('')
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault()
    if (!content.trim() || sending) return
    if (wsState === 'live') {
      sendWs()
      return
    }
    await sendRest()
  }

  async function handleEdit(messageId: string) {
    if (!editContent.trim()) return
    setError(null)
    try {
      const res = await apiRequest<ForumMessage>(`/api/forum/messages/${messageId}`, {
        method: 'PUT',
        body: { courseId, content: editContent.trim() },
      })
      if (!res.success) {
        throw new Error(res.message || 'No se pudo editar el mensaje')
      }
      const updated = res.data?.content ?? editContent.trim()
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: updated } : m)),
      )
      setEditingId(null)
      setEditContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar')
    }
  }

  async function handleDelete(messageId: string) {
    if (!confirm('¿Eliminar este mensaje?')) return
    setError(null)
    try {
      const res = await apiRequest<string>(`/api/forum/messages/${messageId}`, { method: 'DELETE' })
      if (!res.success) {
        throw new Error(res.message || 'No se pudo eliminar el mensaje')
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const isOwn = (m: ForumMessage) => {
    const messageEmail = normalizeEmail(m.studentEmail)
    return Boolean(currentUserEmail) && messageEmail === currentUserEmail
  }

  return (
    <div
      className="forum-chat-root"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#efeae2' }}
    >
      <div
        style={{
          background: '#1d4ed8',
          color: 'white',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <Link to="/dashboard" style={{ color: 'white', fontSize: '20px', textDecoration: 'none' }}>
          ←
        </Link>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {courseId.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Foro del curso {courseId}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {wsState === 'live' && '🟢 En línea'}
            {wsState === 'connecting' && '🟡 Conectando...'}
            {wsState === 'off' && '🟡 Modo REST (sin WebSocket)'}
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 16px', fontSize: 13 }}>
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#b91c1c',
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 14 }}>
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : null}

        {messages.map((m) => {
          const own = isOwn(m)
          const isEditing = editingId === m.id

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: own ? 'flex-end' : 'flex-start',
                marginBottom: 2,
              }}
            >
              <div style={{ maxWidth: '75%', position: 'relative' }}>
                <div
                  style={{
                    background: own ? '#d9fdd3' : '#ffffff',
                    borderRadius: own ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '8px 12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    position: 'relative',
                  }}
                >
                  {!own ? (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#1d4ed8',
                        marginBottom: 3,
                      }}
                    >
                      {m.studentName || m.studentEmail}
                    </div>
                  ) : null}

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        autoFocus
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #93c5fd',
                          outline: 'none',
                          fontSize: 14,
                          resize: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(m.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#1d4ed8',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditContent('')
                          }}
                          style={{
                            padding: '4px 12px',
                            background: '#e2e8f0',
                            color: '#475569',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {m.content}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 10,
                      color: '#64748b',
                      textAlign: 'right',
                      marginTop: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    <div>{formatMessageTimestamp(m.sentAt)}</div>
                    {own ? <span style={{ marginLeft: 4 }}>✓✓</span> : null}
                  </div>

                  {own && !isEditing ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(m.id)
                          setEditContent(m.content)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#1d4ed8',
                          padding: 0,
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(m.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#dc2626',
                          padding: 0,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void handleSend(e)}
        style={{
          background: '#f0f2f5',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            wsState === 'live'
              ? 'Escribe un mensaje... (Enter para enviar)'
              : 'Escribe un mensaje... (REST, Enter para enviar)'
          }
          rows={1}
          disabled={sending}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            resize: 'none',
            outline: 'none',
            background: 'white',
            maxHeight: 120,
            fontFamily: 'inherit',
            lineHeight: 1.4,
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: content.trim() && !sending ? '#1d4ed8' : '#94a3b8',
            border: 'none',
            cursor: content.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: 'white',
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </form>
    </div>
  )
}
