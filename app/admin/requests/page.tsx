'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#FFFBEB', color: '#F59E0B', label: 'Pending'   },
  accepted: { bg: '#ECFDF5', color: '#10B981', label: 'Accepted'  },
  backlog:  { bg: '#EEF0FF', color: '#6C63FF', label: 'Backlog'   },
  declined: { bg: '#FEF2F2', color: '#EF4444', label: 'Declined'  },
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('requests').select('*, clients(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setRequests(data ?? []); setLoading(false) })
  }, [])

  async function update(id: string, status: string, clientId: string, title: string) {
    const supabase = createClient()
    await supabase.from('requests').update({ status }).eq('id', id)
    if (status === 'accepted') {
      const { data: existing } = await supabase.from('tasks').select('id').eq('client_id', clientId).eq('title', title).single()
      if (!existing) await supabase.from('tasks').insert({ client_id: clientId, title, done: false, status: 'in_progress' })
    }
    setRequests(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const pending = requests.filter(r => r.status === 'pending')
  const rest    = requests.filter(r => r.status !== 'pending')

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`.req-body { padding:20px 24px; } @media(max-width:768px){ .req-body { padding:12px 16px; } }`}</style>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #E8EAF0', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Studio / Requests</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>Requests {!loading && `(${pending.length} pending)`}</div>
      </div>
      <div className="req-body">
        {loading && <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>Loading…</div>}
        {!loading && requests.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📥</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No requests yet</div>
            <div style={{ fontSize: 14, color: '#94A3B8' }}>Client requests will appear here.</div>
          </div>
        )}
        {pending.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#F59E0B', marginBottom: 12 }}>⚡ Needs action ({pending.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', marginBottom: 2, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.clients?.name} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#FFFBEB', color: '#F59E0B', flexShrink: 0 }}>Pending</span>
                  </div>
                  {r.description && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{r.description}</div>}
                  {r.link && <a href={r.link} target="_blank" style={{ fontSize: 12, color: '#6C63FF', display: 'block', marginBottom: 12 }}>{r.link}</a>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => update(r.id, 'accepted', r.client_id, r.title)}
                      style={{ flex: 1, padding: '11px', background: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Accept</button>
                    <button onClick={() => update(r.id, 'backlog', r.client_id, r.title)}
                      style={{ flex: 1, padding: '11px', background: '#EEF0FF', color: '#6C63FF', border: '1px solid rgba(108,99,255,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 Backlog</button>
                    <button onClick={() => update(r.id, 'declined', r.client_id, r.title)}
                      style={{ flex: 1, padding: '11px', background: '#FEF2F2', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {rest.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 12 }}>All requests</div>
            <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 14, overflow: 'hidden' }}>
              {rest.map((r, i) => {
                const s = STATUS[r.status] ?? STATUS.pending
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < rest.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{r.clients?.name} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
