'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'

const STEPS = [
  { label: 'Submitted',   icon: '📥' },
  { label: 'In Progress', icon: '⚙️'  },
  { label: 'In Review',   icon: '👀' },
  { label: 'Completed',   icon: '✅' },
]

const REQ_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#FFFBEB', color: '#F59E0B', label: 'Pending'    },
  accepted: { bg: '#ECFDF5', color: '#10B981', label: 'Accepted'   },
  backlog:  { bg: '#EEF0FF', color: '#6C63FF', label: 'Next month' },
  declined: { bg: '#FEF2F2', color: '#EF4444', label: 'Declined'   },
}

async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('client-uploads').upload(path, file, { upsert: false })
  if (error) { console.error('Upload error:', error); return null }
  const { data } = supabase.storage.from('client-uploads').getPublicUrl(path)
  return data.publicUrl
}

export default function PortalHomePage() {
  const [client, setClient]             = useState<any>(null)
  const [clientTasks, setClientTasks]   = useState<any[]>([])
  const [messages, setMessages]         = useState<any[]>([])
  const [requests, setRequests]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<any>(null)
  const [taskResp, setTaskResp]         = useState('')
  const [taskFiles, setTaskFiles]       = useState<File[]>([])
  const [savingTask, setSavingTask]     = useState(false)
  const [msgText, setMsgText]           = useState('')
  const [sending, setSending]           = useState(false)
  const [reqTitle, setReqTitle]         = useState('')
  const [reqDesc, setReqDesc]           = useState('')
  const [reqLink, setReqLink]           = useState('')
  const [reqFiles, setReqFiles]         = useState<File[]>([])
  const [submitting, setSubmitting]     = useState(false)
  const [reqSuccess, setReqSuccess]     = useState(false)
  const [reqError, setReqError]         = useState('')
  const [showReqHistory, setShowReqHistory] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const taskFileRef = useRef<HTMLInputElement>(null)
  const reqFileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: any = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        Promise.all([
          supabase.from('client_tasks').select('*').eq('client_id', c.id).order('created_at'),
          supabase.from('messages').select('*').eq('client_id', c.id).order('created_at'),
          supabase.from('requests').select('*').eq('client_id', c.id).order('created_at', { ascending: false }),
        ]).then(([ct, m, r]) => {
          setClientTasks(ct.data ?? [])
          setMessages(m.data ?? [])
          setRequests(r.data ?? [])
          setLoading(false)
        })
        channel = supabase.channel('portal-msgs-' + c.id)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${c.id}` },
            payload => setMessages(ms => [...ms, payload.new as any]))
          .subscribe()
      })
    })
    return () => { if (channel) createClient().removeChannel(channel) }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function completeTask() {
    if (!modal) return
    setSavingTask(true)
    const supabase = createClient()
    let fileUrls: string[] = []
    for (const file of taskFiles) {
      const url = await uploadToStorage(file, `tasks/${modal.client_id}`)
      if (url) fileUrls.push(url)
    }
    const resp = fileUrls.length > 0
      ? `Files: ${fileUrls.join(', ')}${taskResp ? ' — ' + taskResp : ''}`
      : taskResp || 'Submitted'
    await supabase.from('client_tasks').update({ done: true, response: resp }).eq('id', modal.id)
    setClientTasks(t => t.map(x => x.id === modal.id ? { ...x, done: true, response: resp } : x))
    setModal(null); setTaskResp(''); setTaskFiles([]); setSavingTask(false)
  }

  async function sendMessage() {
    if (!msgText.trim() || !client) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({ client_id: client.id, from_admin: false, text: msgText.trim() })
    setMsgText(''); setSending(false)
  }

  async function submitRequest() {
    if (!reqTitle.trim()) { setReqError('Please add a title'); return }
    const left = Math.max(0, (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0))
    setSubmitting(true); setReqError('')
    const supabase = createClient()
    let fileUrls: string[] = []
    for (const file of reqFiles) {
      const url = await uploadToStorage(file, `requests/${client.id}`)
      if (url) fileUrls.push(url)
    }
    const fileUrl = fileUrls[0] || null  // primary file for backward compat
    const title = reqFiles.length > 0 ? `${reqTitle.trim()} [📎 ${reqFiles.length} file${reqFiles.length > 1 ? 's' : ''}]` : reqTitle.trim()
    const { data } = await supabase.from('requests').insert({
      client_id: client.id, title,
      description: reqDesc.trim() || null,
      link: reqLink.trim() || null,
      file_url: fileUrl,
      file_urls: fileUrls.length > 0 ? fileUrls : null,
      status: left <= 0 ? 'backlog' : 'pending'
    }).select().single()
    if (data) {
      setRequests(r => [data, ...r])
      if (left > 0) {
        await supabase.from('clients').update({ revisions_used: (client.revisions_used ?? 0) + 1 }).eq('id', client.id)
        setClient((c: any) => ({ ...c, revisions_used: (c.revisions_used ?? 0) + 1 }))
      }
    }
    setReqTitle(''); setReqDesc(''); setReqLink(''); setReqFiles([])
    setSubmitting(false); setReqSuccess(true)
    setTimeout(() => setReqSuccess(false), 3000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div style={{ fontSize: 14, color: '#94A3B8' }}>Loading your portal…</div>
      </div>
    </div>
  )

  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your portal is being set up</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>Your studio will have everything ready shortly.</div>
      </div>
    </div>
  )

  const firstName   = client.name?.split(' ')[0] ?? client.name
  const tasksDone   = clientTasks.filter(t => t.done).length
  const left        = Math.max(0, (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0))
  const pct         = Math.min(100, Math.round(((client.revisions_used ?? 0) / (client.monthly_revisions ?? 5)) * 100))
  const step        = client.progress_step ?? 1
  const pending     = clientTasks.filter(t => !t.done)
  const done        = clientTasks.filter(t => t.done)

  const S = {
    page:    { fontFamily: 'Inter, sans-serif', background: '#F5F6FA', minHeight: '100vh', paddingBottom: 40 } as any,
    section: { background: '#fff', borderRadius: 16, border: '1px solid #E8EAF0', overflow: 'hidden' } as any,
    sHead:   { padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as any,
    sTitle:  { fontSize: 16, fontWeight: 700, color: '#0D0D1A' } as any,
    sSub:    { fontSize: 13, color: '#64748B', marginTop: 2 } as any,
    pad:     { padding: '0 20px 20px' } as any,
  }

  return (
    <div style={S.page}>
      <style>{`
        .portal-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 24px 60px; }
        .portal-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
        .portal-main { display: flex; flex-direction: column; gap: 16px; }
        .portal-side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 80px; }
        @media(max-width: 900px) {
          .portal-grid { grid-template-columns: 1fr; }
          .portal-side { position: static; }
          .portal-wrap { padding: 16px 14px 60px; }
        }
        .step-line { position: absolute; top: 18px; left: 50%; right: -50%; height: 2px; z-index: 0; }
        .msg-bubble-in  { background: #F1F5F9; border-radius: 4px 16px 16px 16px; padding: 10px 14px; max-width: 78%; }
        .msg-bubble-out { background: linear-gradient(135deg,#6C63FF,#A855F7); border-radius: 16px 4px 16px 16px; padding: 10px 14px; max-width: 78%; }
        .upload-zone { border: 1.5px dashed #D1D5DB; border-radius: 12px; padding: 18px 14px; text-align: center; cursor: pointer; background: #F8FAFC; transition: border-color .2s, background .2s; }
        .upload-zone:hover { border-color: #6C63FF; background: #F0EEFF; }
        .upload-zone.has-file { border-color: #6C63FF; background: #F0EEFF; }
      `}</style>

      {/* Request history panel */}
      {showReqHistory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.4)', display: 'flex' }}
          onClick={e => e.target === e.currentTarget && setShowReqHistory(false)}>
          <div style={{ marginLeft: 'auto', width: '90%', maxWidth: 420, background: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #E8EAF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Request history</div>
              <button onClick={() => setShowReqHistory(false)} style={{ padding: '8px 16px', background: '#F5F6FA', border: '1px solid #E8EAF0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {requests.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No requests yet.</div>}
              {requests.map(r => {
                const s = REQ_STATUS[r.status] ?? REQ_STATUS.pending
                return (
                  <div key={r.id} style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, marginBottom: 12, border: '1px solid #E8EAF0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A', flex: 1, lineHeight: 1.4 }}>{r.title}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                    </div>
                    {r.description && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8, lineHeight: 1.5 }}>{r.description}</div>}
                    {r.link && <a href={r.link} target="_blank" style={{ fontSize: 12, color: '#6C63FF', display: 'block', marginBottom: 6 }}>{r.link}</a>}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" style={{ fontSize: 12, color: '#6C63FF', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        📎 View attached file
                      </a>
                    )}
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && (setModal(null), setTaskResp(''), setTaskFiles([]))}
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: '#E8EAF0', borderRadius: 999, margin: '0 auto 20px' }}/>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{modal.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#0D0D1A' }}>{modal.title}</div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>{modal.description}</div>

            {/* File upload zone */}
            <div
              className={`upload-zone${taskFiles.length > 0 ? ' has-file' : ''}`}
              onClick={() => taskFileRef.current?.click()}
              style={{ marginBottom: 14 }}
            >
              {taskFiles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {taskFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 13, color: '#6C63FF', fontWeight: 600, flex: 1 }}>{f.name}</span>
                      <button onClick={e => { e.stopPropagation(); setTaskFiles(fs => fs.filter((_, j) => j !== i)) }}
                        style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: '#6C63FF', marginTop: 4 }}>+ Tap to add more files</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>Tap to attach files</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>PNG, PDF, SVG, ZIP, DOCX — multiple allowed</div>
                </>
              )}
            </div>
            <input ref={taskFileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) setTaskFiles(fs => [...fs, ...files]); e.target.value = '' }}/>

            <textarea value={taskResp} onChange={e => setTaskResp(e.target.value)} rows={4}
              placeholder={modal.type === 'file' ? 'Add a note (optional)…' : modal.type === 'review' ? 'Approved! / Please change…' : 'Your response…'}
              style={{ width: '100%', fontSize: 15, padding: '12px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', resize: 'none', boxSizing: 'border-box' }}/>

            {savingTask && taskFiles.length > 0 && (
              <div style={{ fontSize: 13, color: '#6C63FF', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Uploading file…
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setModal(null); setTaskResp(''); setTaskFiles([]) }}
                style={{ flex: 1, padding: 14, background: '#F5F6FA', color: '#64748B', border: '1px solid #E8EAF0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={completeTask} disabled={savingTask}
                style={{ flex: 2, padding: 14, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: savingTask ? 0.7 : 1 }}>
                {savingTask ? 'Uploading…' : 'Submit & done ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="portal-wrap">
        <div className="portal-grid">

          {/* ── LEFT: main content ── */}
          <div className="portal-main">

            {/* WELCOME HERO */}
            <div style={{ background: 'linear-gradient(135deg,#6C63FF 0%,#A855F7 100%)', borderRadius: 20, padding: '28px 28px', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(108,99,255,.3)' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }}/>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: .7, marginBottom: 6, letterSpacing: '.01em' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 4 }}>
                  Welcome back, {firstName} 👋
                </div>
                <div style={{ fontSize: 14, opacity: .7, marginBottom: 24 }}>
                  {client.type} · ${client.monthly_retainer}/month
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { val: `${tasksDone}/${clientTasks.length}`, lbl: 'Tasks done' },
                    { val: `${left} left`,                       lbl: 'Revisions left' },
                    { val: client.next_payment ?? 'TBD',         lbl: 'Next payment' },
                  ].map(s => (
                    <div key={s.lbl} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, marginBottom: 5 }}>{s.val}</div>
                      <div style={{ fontSize: 12, opacity: .7, lineHeight: 1.3 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PROGRESS */}
            <div style={S.section}>
              <div style={S.sHead}><div style={S.sTitle}>Website progress</div></div>
              <div style={{ padding: '20px 16px 24px', display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                {STEPS.map((s, i) => {
                  const isDone = i < step; const isActive = i === step
                  return (
                    <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {i < STEPS.length - 1 && <div className="step-line" style={{ background: isDone ? '#10B981' : '#E8EAF0' }}/>}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2.5px solid ${isDone ? '#10B981' : isActive ? '#6C63FF' : '#E8EAF0'}`, background: isDone ? '#10B981' : isActive ? '#6C63FF' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, position: 'relative', zIndex: 1, marginBottom: 10, boxShadow: isActive ? '0 0 0 5px rgba(108,99,255,.15)' : 'none', transition: 'all .3s' }}>
                        {isDone ? <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : <span style={{ color: isActive ? '#fff' : '#CBD5E1', fontSize: 16 }}>{s.icon}</span>}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: isDone ? '#10B981' : isActive ? '#6C63FF' : '#94A3B8', lineHeight: 1.3, padding: '0 4px' }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ACTION ITEMS */}
            <div style={S.section}>
              <div style={S.sHead}>
                <div>
                  <div style={S.sTitle}>Action items</div>
                  <div style={S.sSub}>Tap a task to respond or upload a file</div>
                </div>
                {pending.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: '#EEF0FF', color: '#6C63FF' }}>{pending.length} pending</span>}
              </div>
              <div style={S.pad}>
                {pending.length === 0 && done.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 14 }}>No action items yet 🎉</div>}
                {pending.map(t => (
                  <div key={t.id} onClick={() => { setModal(t); setTaskResp(''); setTaskFiles([]) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{t.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D1A', marginBottom: 3 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{t.type === 'file' ? '📎 Upload a file' : t.type === 'review' ? '🔍 Review & approve' : '📝 Text response'}</div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                ))}
                {done.length > 0 && (
                  <div style={{ marginTop: pending.length > 0 ? 16 : 0, paddingTop: pending.length > 0 ? 16 : 0, borderTop: pending.length > 0 ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 12 }}>Completed</div>
                    {done.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9', opacity: .6 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.emoji}</div>
                        <div style={{ flex: 1, fontSize: 14, color: '#94A3B8', textDecoration: 'line-through' }}>{t.title}</div>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SUBMIT REQUEST */}
            <div style={S.section}>
              <div style={S.sHead}>
                <div>
                  <div style={S.sTitle}>Submit a request</div>
                  <div style={S.sSub}>Describe what you need changed or added</div>
                </div>
                {requests.length > 0 && (
                  <button onClick={() => setShowReqHistory(true)}
                    style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', background: '#EEF0FF', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    History ({requests.length})
                  </button>
                )}
              </div>
              <div style={{ ...S.pad, paddingTop: 16 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{left} of {client.monthly_revisions ?? 5} revisions left</span>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Resets 1st of month</span>
                  </div>
                  <div style={{ height: 8, background: '#E8EAF0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: left === 0 ? '#EF4444' : left <= 1 ? '#F59E0B' : 'linear-gradient(90deg,#6C63FF,#A855F7)', borderRadius: 999, transition: 'width .4s' }}/>
                  </div>
                  {left === 0 && <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 8, fontWeight: 500 }}>⚠ Limit reached — new requests will be queued for next month.</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} placeholder="What do you need changed? *"
                    style={{ fontSize: 15, padding: '13px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', width: '100%' }}/>
                  <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} placeholder="More details — which page, what text, any references…" rows={3}
                    style={{ fontSize: 15, padding: '13px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', resize: 'none', boxSizing: 'border-box', width: '100%' }}/>
                  <input value={reqLink} onChange={e => setReqLink(e.target.value)} placeholder="Reference link (optional)"
                    style={{ fontSize: 15, padding: '13px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', width: '100%' }}/>
                  <div className={`upload-zone${reqFiles.length > 0 ? ' has-file' : ''}`} onClick={() => reqFileRef.current?.click()}>
                    {reqFiles.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {reqFiles.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span style={{ fontSize: 13, color: '#6C63FF', fontWeight: 600, flex: 1 }}>{f.name}</span>
                            <button onClick={e => { e.stopPropagation(); setReqFiles(fs => fs.filter((_, j) => j !== i)) }}
                              style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                          </div>
                        ))}
                        <div style={{ fontSize: 12, color: '#6C63FF', marginTop: 4 }}>+ Tap to add more files</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
                        <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>Attach files (optional)</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>PNG, PDF, SVG, ZIP, DOCX — multiple allowed</div>
                      </>
                    )}
                  </div>
                  <input ref={reqFileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) setReqFiles(fs => [...fs, ...files]); e.target.value = '' }}/>
                  {reqError && <div style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>{reqError}</div>}
                  <button onClick={submitRequest} disabled={submitting}
                    style={{ padding: '15px', background: reqSuccess ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {reqSuccess ? '✓ Request submitted!' : submitting ? 'Uploading & submitting…' : left <= 0 ? 'Add to next month →' : 'Submit request →'}
                  </button>
                </div>
              </div>
            </div>

          </div>{/* end portal-main */}

          {/* ── RIGHT SIDEBAR ── */}
          <div className="portal-side">

            {/* MESSAGES */}
            <div style={{ ...S.section, display: 'flex', flexDirection: 'column' }}>
              <div style={S.sHead}><div style={S.sTitle}>Messages</div></div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, maxHeight: 420, overflowY: 'auto' }}>
                {messages.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>No messages yet — say hello! 👋</div>}
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.from_admin ? 'flex-start' : 'flex-end' }}>
                    <div className={m.from_admin ? 'msg-bubble-in' : 'msg-bubble-out'}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: m.from_admin ? '#6C63FF' : 'rgba(255,255,255,.8)' }}>{m.from_admin ? 'Studio' : 'You'}</div>
                      <div style={{ fontSize: 14, color: m.from_admin ? '#0D0D1A' : '#fff', lineHeight: 1.5 }}>{m.text}</div>
                      <div style={{ fontSize: 11, marginTop: 4, color: m.from_admin ? '#94A3B8' : 'rgba(255,255,255,.65)' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef}/>
              </div>
              <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #E8EAF0', display: 'flex', gap: 10 }}>
                <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Write a message…"
                  style={{ flex: 1, fontSize: 14, padding: '11px 13px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none' }}/>
                <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                  style={{ padding: '11px 18px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!msgText.trim() || sending) ? 0.5 : 1 }}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>

            {/* BILLING */}
            <div style={S.section}>
              <div style={S.sHead}><div style={S.sTitle}>Billing</div></div>
              <div style={S.pad}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[
                    ['Plan', 'Monthly retainer'],
                    ['Amount', `$${client.monthly_retainer}/month`],
                    ['Next payment', client.next_payment ?? 'Contact studio'],
                    ['Status', 'Paid up to date'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ padding: '12px', background: '#F8FAFC', borderRadius: 12 }}>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: l === 'Status' ? '#10B981' : '#0D0D1A' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => alert('Contact your studio to update payment info.')}
                    style={{ padding: '11px', background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E8EAF0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Update card</button>
                  <button onClick={() => alert('A cancellation request will be sent to your studio.')}
                    style={{ padding: '11px', background: '#FEF2F2', color: '#EF4444', border: '1.5px solid rgba(239,68,68,.15)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel plan</button>
                </div>
              </div>
            </div>

          </div>{/* end portal-side */}

        </div>
      </div>
    </div>
  )
}
