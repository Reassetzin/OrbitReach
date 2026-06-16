'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'
import { useParams } from 'next/navigation'

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#ECFDF5', color: '#10B981', label: 'Active'    },
  review:  { bg: '#FFFBEB', color: '#F59E0B', label: 'In Review' },
  pending: { bg: '#F5F6FA', color: '#64748B', label: 'Pending'   },
}
const STEPS      = ['Submitted', 'In Progress', 'In Review', 'Completed']
const TASK_EMOJIS = ['📋','📎','📝','🔍','🖼️','✅','💬','🔗']
const TASK_TYPES  = ['file', 'text', 'review'] as const

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient]             = useState<any>(null)
  const [tasks, setTasks]               = useState<any[]>([])
  const [clientTasks, setClientTasks]   = useState<any[]>([])
  const [messages, setMessages]         = useState<any[]>([])
  const [requests, setRequests]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [editStatus, setEditStatus]     = useState('pending')
  const [progressStep, setProgressStep] = useState(0)
  const [newTask, setNewTask]           = useState('')
  const [showCtForm, setShowCtForm]     = useState(false)
  const [ctForm, setCtForm]             = useState({ emoji: '📋', title: '', description: '', type: 'text' as typeof TASK_TYPES[number] })
  const [newMsg, setNewMsg]             = useState('')
  const [sending, setSending]           = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const [activeSection, setActiveSection] = useState<'tasks'|'items'|'messages'|'billing'>('tasks')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    let channel: any = null
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('client_id', id).order('created_at'),
      supabase.from('client_tasks').select('*').eq('client_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('client_id', id).order('created_at'),
      supabase.from('requests').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]).then(([c, t, ct, m, r]) => {
      setClient(c.data)
      setEditStatus(c.data?.status ?? 'pending')
      setProgressStep(c.data?.progress_step ?? 0)
      setTasks(t.data ?? [])
      setClientTasks(ct.data ?? [])
      setMessages(m.data ?? [])
      setRequests(r.data ?? [])
      setLoading(false)
      channel = supabase.channel('admin-detail-' + id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${id}` },
          payload => setMessages(ms => [...ms, payload.new as any]))
        .subscribe()
    })
    return () => { if (channel) createClient().removeChannel(channel) }
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function updateStatus(status: string) {
    setEditStatus(status)
    await createClient().from('clients').update({ status }).eq('id', id as string)
    setClient((c: any) => ({ ...c, status }))
  }

  async function updateProgress(step: number) {
    setProgressStep(step)
    await createClient().from('clients').update({ progress_step: step }).eq('id', id as string)
    setClient((c: any) => ({ ...c, progress_step: step }))
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data } = await createClient().from('tasks')
      .insert({ client_id: id, title: newTask.trim(), done: false, status: 'backlog' })
      .select().single()
    if (data) setTasks(t => [...t, data])
    setNewTask('')
  }

  async function toggleTask(task: any) {
    const done = !task.done
    await createClient().from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  async function addClientTask() {
    if (!ctForm.title.trim()) return
    const { data } = await createClient().from('client_tasks').insert({
      client_id: id, emoji: ctForm.emoji, title: ctForm.title.trim(),
      description: ctForm.description.trim(), type: ctForm.type, done: false
    }).select().single()
    if (data) setClientTasks(t => [...t, data])
    setCtForm({ emoji: '📋', title: '', description: '', type: 'text' })
    setShowCtForm(false)
  }

  async function deleteClientTask(ctId: string) {
    await createClient().from('client_tasks').delete().eq('id', ctId)
    setClientTasks(t => t.filter(x => x.id !== ctId))
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    setSending(true)
    await createClient().from('messages').insert({ client_id: id, from_admin: true, text: newMsg.trim() })
    setNewMsg('')
    setSending(false)
  }

  async function acceptRequest(req: any) {
    await createClient().from('requests').update({ status: 'accepted' }).eq('id', req.id)
    if (!tasks.some(t => t.title === req.title)) {
      const { data } = await createClient().from('tasks')
        .insert({ client_id: id, title: req.title, done: false, status: 'in_progress' })
        .select().single()
      if (data) setTasks(t => [...t, data])
    }
    setRequests(r => r.map(x => x.id === req.id ? { ...x, status: 'accepted' } : x))
  }

  async function declineRequest(req: any) {
    await createClient().from('requests').update({ status: 'declined' }).eq('id', req.id)
    setRequests(r => r.map(x => x.id === req.id ? { ...x, status: 'declined' } : x))
  }

  async function adjustRevisions(field: 'revisions_used' | 'monthly_revisions', delta: number) {
    const current = client[field] ?? (field === 'monthly_revisions' ? 5 : 0)
    const next = Math.max(0, current + delta)
    await createClient().from('clients').update({ [field]: next }).eq('id', id as string)
    setClient((c: any) => ({ ...c, [field]: next }))
  }

  async function resetRevisions() {
    await createClient().from('clients').update({ revisions_used: 0 }).eq('id', id as string)
    setClient((c: any) => ({ ...c, revisions_used: 0 }))
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading…</div>
  if (!client) return <div style={{ padding: 48, textAlign: 'center', color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>Client not found.</div>

  const p = STATUS_META[client.status] ?? STATUS_META.pending
  const pendingReqs = requests.filter(r => r.status === 'pending')
  const REQ_S: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: '#FFFBEB', color: '#F59E0B', label: 'Pending'   },
    accepted: { bg: '#ECFDF5', color: '#10B981', label: 'Accepted'  },
    backlog:  { bg: '#EEF0FF', color: '#6C63FF', label: 'Next month'},
    declined: { bg: '#FEF2F2', color: '#EF4444', label: 'Declined'  },
  }

  const TABS: { key: typeof activeSection; label: string }[] = [
    { key: 'tasks',    label: 'Tasks'    },
    { key: 'items',    label: 'Actions'  },
    { key: 'messages', label: 'Messages' },
    { key: 'billing',  label: 'Billing'  },
  ]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100dvh', background: '#F5F6FA' }}>
      <style>{`
        /* Request history panel */
        .hist-panel { position:fixed; inset:0; z-index:400; display:flex; }
        .hist-inner { margin-left:auto; width:92%; max-width:420px; background:#fff; height:100%; display:flex; flex-direction:column; box-shadow:-8px 0 40px rgba(0,0,0,.14); }
        /* Tabs scroll */
        .detail-tabs { display:flex; background:#fff; border-bottom:1px solid #E8EAF0; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .detail-tabs::-webkit-scrollbar { display:none; }
        .detail-tab { flex-shrink:0; padding:14px 20px; font-size:14px; font-weight:500; color:#94A3B8; border:none; border-bottom:2px solid transparent; background:transparent; cursor:pointer; white-space:nowrap; }
        .detail-tab.active { color:#6C63FF; border-bottom-color:#6C63FF; font-weight:700; }
        /* Content pad */
        .section-pad { padding:20px 16px; }
        /* Task row */
        .task-row { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid #F1F5F9; }
        /* Msg bubbles */
        .msg-in  { background:#F1F5F9; border-radius:4px 14px 14px 14px; padding:10px 13px; max-width:78%; }
        .msg-out { background:linear-gradient(135deg,#6C63FF,#A855F7); border-radius:14px 4px 14px 14px; padding:10px 13px; max-width:78%; box-shadow:0 4px 12px rgba(108,99,255,.2); }
        /* Billing grid */
        .bill-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        /* Progress bar */
        .progress-steps { display:flex; align-items:flex-start; padding:20px 16px 24px; }
        .step-connector { position:absolute; top:18px; left:50%; right:-50%; height:2px; z-index:0; }
      `}</style>

      {/* ── REQUEST HISTORY PANEL ── */}
      {showHistory && (
        <div className="hist-panel" style={{ background: 'rgba(0,0,0,.4)' }} onClick={e => e.target === e.currentTarget && setShowHistory(false)}>
          <div className="hist-inner">
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E8EAF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Requests</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{requests.length} total</div>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ padding: '8px 16px', background: '#F5F6FA', border: '1px solid #E8EAF0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {requests.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>No requests yet.</div>}
              {requests.map(r => {
                const s = REQ_S[r.status] ?? REQ_S.pending
                return (
                  <div key={r.id} style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, marginBottom: 12, border: '1px solid #E8EAF0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0D0D1A', lineHeight: 1.4 }}>{r.title}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                    </div>
                    {r.description && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8, lineHeight: 1.5 }}>{r.description}</div>}
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: r.status === 'pending' ? 12 : 0 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => acceptRequest(r)} style={{ flex: 1, padding: '9px', background: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Accept</button>
                        <button onClick={() => declineRequest(r)} style={{ flex: 1, padding: '9px', background: '#FEF2F2', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Decline</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EAF0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <a href="/admin/clients" style={{ fontSize: 12, color: '#6C63FF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Clients
        </a>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-.02em' }}>{client.name}</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>{client.type} · <strong style={{ color: '#0D0D1A' }}>${client.monthly_retainer}/mo</strong></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: p.bg, color: p.color }}>{p.label}</span>
            {pendingReqs.length > 0 && (
              <button onClick={() => setShowHistory(true)} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: '#FFFBEB', color: '#F59E0B', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ⚡ {pendingReqs.length} request{pendingReqs.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── STATUS + PROGRESS ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EAF0', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['active', 'review', 'pending'].map(s => (
              <button key={s} onClick={() => updateStatus(s)}
                style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `1.5px solid ${editStatus === s ? '#6C63FF' : '#E8EAF0'}`, background: editStatus === s ? '#EEF0FF' : '#F8FAFC', color: editStatus === s ? '#6C63FF' : '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {s === 'active' ? 'Active' : s === 'review' ? 'In Review' : 'Pending'}
              </button>
            ))}
          </div>
        </div>
        {/* Progress */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 8 }}>Progress</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {STEPS.map((label, i) => (
              <button key={i} onClick={() => updateProgress(i)}
                style={{ padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${progressStep === i ? '#6C63FF' : progressStep > i ? '#10B981' : '#E8EAF0'}`, background: progressStep === i ? '#EEF0FF' : progressStep > i ? '#ECFDF5' : '#F8FAFC', color: progressStep === i ? '#6C63FF' : progressStep > i ? '#10B981' : '#94A3B8', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 1.3 }}>
                {progressStep > i ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION TABS ── */}
      <div className="detail-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`detail-tab${activeSection === t.key ? ' active' : ''}`} onClick={() => setActiveSection(t.key)}>
            {t.label}
          </button>
        ))}
        <button className="detail-tab" onClick={() => setShowHistory(true)} style={{ color: requests.length > 0 && pendingReqs.length > 0 ? '#F59E0B' : '#94A3B8' }}>
          Requests {requests.length > 0 ? `(${requests.length})` : ''}
        </button>
      </div>

      {/* ── YOUR TASKS ── */}
      {activeSection === 'tasks' && (
        <div className="section-pad">
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EAF0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A' }}>Your tasks</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>Internal — not visible to client</div>
            </div>
            <div style={{ padding: '0 18px' }}>
              {tasks.length === 0 && <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No tasks yet.</div>}
              {tasks.map(t => (
                <div key={t.id} className="task-row">
                  <div onClick={() => toggleTask(t)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${t.done ? '#6C63FF' : '#E8EAF0'}`, background: t.done ? '#6C63FF' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.done && <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{ flex: 1, fontSize: 15, color: t.done ? '#94A3B8' : '#0D0D1A', textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{t.title}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#EEF0FF', color: '#6C63FF', flexShrink: 0 }}>{t.status}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Add a task…"
                style={{ flex: 1, fontSize: 15, padding: '11px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none' }}/>
              <button onClick={addTask} style={{ padding: '11px 18px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT ACTION ITEMS ── */}
      {activeSection === 'items' && (
        <div className="section-pad">
          <div style={{ background: '#EEF0FF', border: '1px solid rgba(108,99,255,.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#6C63FF', lineHeight: 1.5 }}>
            💡 These are tasks assigned to the client — they see and complete them in their portal.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientTasks.length === 0 && <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No action items assigned yet.</div>}
            {clientTasks.map(ct => (
              <div key={ct.id} style={{ background: '#fff', border: `1.5px solid ${ct.done ? '#ECFDF5' : '#E8EAF0'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{ct.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ct.done ? '#94A3B8' : '#0D0D1A', textDecoration: ct.done ? 'line-through' : 'none', marginBottom: 4 }}>{ct.title}</div>
                  {ct.description && <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6, lineHeight: 1.4 }}>{ct.description}</div>}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#EEF0FF', color: '#6C63FF' }}>{ct.type}</span>
                    {ct.done
                      ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ECFDF5', color: '#10B981' }}>✓ Done</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FFFBEB', color: '#F59E0B' }}>Pending</span>}
                    {ct.response && <span style={{ fontSize: 12, color: '#94A3B8' }}>"{ct.response.substring(0, 40)}"</span>}
                  </div>
                </div>
                <button onClick={() => deleteClientTask(ct.id)} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer', fontSize: 18, padding: 4, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')} onMouseLeave={e => (e.currentTarget.style.color = '#E8EAF0')}>✕</button>
              </div>
            ))}
            {!showCtForm ? (
              <button onClick={() => setShowCtForm(true)} style={{ padding: '14px', background: '#fff', color: '#6C63FF', border: '1.5px dashed #D1D5DB', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                + Assign action item to client
              </button>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A' }}>New action item</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TASK_EMOJIS.map(e => (
                    <button key={e} onClick={() => setCtForm(f => ({ ...f, emoji: e }))}
                      style={{ width: 38, height: 38, borderRadius: 9, border: `2px solid ${ctForm.emoji === e ? '#6C63FF' : '#E8EAF0'}`, background: ctForm.emoji === e ? '#EEF0FF' : '#F8FAFC', fontSize: 18, cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
                <input value={ctForm.title} onChange={e => setCtForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title…"
                  style={{ fontSize: 15, padding: '12px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none' }}/>
                <textarea value={ctForm.description} onChange={e => setCtForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions for client…" rows={2}
                  style={{ fontSize: 14, padding: '12px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', resize: 'none' }}/>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TASK_TYPES.map(t => (
                    <button key={t} onClick={() => setCtForm(f => ({ ...f, type: t }))}
                      style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: `1.5px solid ${ctForm.type === t ? '#6C63FF' : '#E8EAF0'}`, background: ctForm.type === t ? '#EEF0FF' : '#F8FAFC', color: ctForm.type === t ? '#6C63FF' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {t === 'file' ? '📎 File' : t === 'text' ? '📝 Text' : '🔍 Review'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowCtForm(false)} style={{ flex: 1, padding: '12px', background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EAF0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addClientTask} disabled={!ctForm.title.trim()} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Assign to client →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      {activeSection === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 220px)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>No messages yet. Send the first one.</div>}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.from_admin ? 'flex-end' : 'flex-start' }}>
                <div className={m.from_admin ? 'msg-out' : 'msg-in'}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: m.from_admin ? 'rgba(255,255,255,.75)' : '#6C63FF' }}>{m.from_admin ? 'You' : client.name}</div>
                  <div style={{ fontSize: 15, color: m.from_admin ? '#fff' : '#0D0D1A', lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: m.from_admin ? 'rgba(255,255,255,.6)' : '#94A3B8' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E8EAF0', background: '#fff', display: 'flex', gap: 10, flexShrink: 0 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Write a message…"
              style={{ flex: 1, fontSize: 15, padding: '12px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none' }}/>
            <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (!newMsg.trim() || sending) ? .5 : 1 }}>
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* ── BILLING ── */}
      {activeSection === 'billing' && (
        <div className="section-pad">
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', fontSize: 16, fontWeight: 700, color: '#0D0D1A' }}>Billing</div>
            <div className="bill-grid" style={{ padding: '16px 18px' }}>
              {[
                ['Contact', client.contact ?? '—'],
                ['Email', client.email ?? '—'],
                ['Service', client.type],
                ['Setup fee', client.setup_fee > 0 ? `$${client.setup_fee}` : '—'],
                ['Monthly', `$${client.monthly_retainer}/mo`],
                ['Next payment', client.next_payment ?? 'Not set'],
              ].map(([l, v]) => (
                <div key={l} style={{ padding: '12px', background: '#F8FAFC', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Revisions */}
            <div style={{ padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', marginBottom: 14 }}>Revisions</div>
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A' }}>{client.revisions_used ?? 0} / {client.monthly_revisions ?? 5} used</span>
                  <button onClick={resetRevisions} style={{ padding: '6px 12px', background: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>↺ Reset</button>
                </div>
                <div style={{ height: 8, background: '#E8EAF0', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round(((client.revisions_used ?? 0) / (client.monthly_revisions ?? 5)) * 100))}%`, background: 'linear-gradient(90deg,#6C63FF,#A855F7)', borderRadius: 999 }}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #E8EAF0' }}>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>Used this month</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => adjustRevisions('revisions_used', -1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E8EAF0', background: '#F8FAFC', fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>−</button>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', flex: 1, textAlign: 'center' }}>{client.revisions_used ?? 0}</span>
                      <button onClick={() => adjustRevisions('revisions_used', 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E8EAF0', background: '#F8FAFC', fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>+</button>
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #E8EAF0' }}>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>Monthly allowance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => adjustRevisions('monthly_revisions', -1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E8EAF0', background: '#F8FAFC', fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>−</button>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#6C63FF', flex: 1, textAlign: 'center' }}>{client.monthly_revisions ?? 5}</span>
                      <button onClick={() => adjustRevisions('monthly_revisions', 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E8EAF0', background: '#F8FAFC', fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
