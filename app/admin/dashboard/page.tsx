'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const PILL: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#ECFDF5', color: '#10B981', label: 'Active'    },
  review:  { bg: '#FFFBEB', color: '#F59E0B', label: 'In Review' },
  pending: { bg: '#F5F6FA', color: '#64748B', label: 'Pending'   },
}
const AV_BG   = ['#ECFDF5','#EEF0FF','#FFFBEB','#EFF6FF']
const AV_TEXT = ['#10B981','#6C63FF','#92400E','#3B82F6']
const DOT     = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444']

export default function AdminDashboard() {
  const [clients, setClients]     = useState<any[]>([])
  const [tasks, setTasks]         = useState<any[]>([])
  const [requests, setRequests]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [newTaskMap, setNewTaskMap] = useState<Record<string,string>>({})
  const [reqFilter, setReqFilter] = useState<'pending'|'all'>('pending')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg]   = useState('')
  const [selectedReq, setSelectedReq] = useState<any>(null)

  async function resetRevisions() {
    if (!confirm('Reset all client revision counts to 0? This cannot be undone.')) return
    setResetting(true); setResetMsg('')
    try {
      const res = await fetch('/api/reset-revisions', {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET ?? 'manual' }
      })
      const json = await res.json()
      if (json.success) {
        setResetMsg(`✓ Reset ${json.reset} client${json.reset !== 1 ? 's' : ''}`)
        setClients(c => c.map(cl => ({ ...cl, revisions_used: 0 })))
      } else {
        setResetMsg('Error: ' + (json.error ?? 'unknown'))
      }
    } catch { setResetMsg('Network error') }
    setResetting(false)
    setTimeout(() => setResetMsg(''), 4000)
  }

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at'),
      supabase.from('requests').select('*, clients(name)').order('created_at', { ascending: false }),
    ]).then(([c, t, r]) => {
      setClients(c.data ?? [])
      setTasks(t.data ?? [])
      setRequests(r.data ?? [])
      setLoading(false)
    })
  }, [])

  async function toggleTask(task: any) {
    const done = !task.done
    await createClient().from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  async function addTask(clientId: string) {
    const title = (newTaskMap[clientId] ?? '').trim()
    if (!title) return
    const { data } = await createClient().from('tasks').insert({ client_id: clientId, title, done: false, status: 'backlog' }).select().single()
    if (data) setTasks(t => [...t, data])
    setNewTaskMap(m => ({ ...m, [clientId]: '' }))
  }

  async function updateReq(id: string, status: string, clientId: string, title: string) {
    await createClient().from('requests').update({ status }).eq('id', id)
    if (status === 'accepted') {
      const exists = tasks.some(t => t.client_id === clientId && t.title === title)
      if (!exists) {
        const { data } = await createClient().from('tasks').insert({ client_id: clientId, title, done: false, status: 'in_progress' }).select().single()
        if (data) setTasks(t => [...t, data])
      }
    }
    setRequests(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  const mrr         = clients.reduce((s, c) => s + (c.monthly_retainer ?? 0), 0)
  const activeCount = clients.filter(c => c.status === 'active').length
  const openTasks   = tasks.filter(t => !t.done).length
  const pendingReqs = requests.filter(r => r.status === 'pending')
  const visibleReqs = reqFilter === 'pending' ? pendingReqs : requests

  const metrics = [
    { label: 'Monthly Recurring', value: `$${mrr}`,        color: 'linear-gradient(135deg,#6C63FF,#A855F7)', shadow: 'rgba(108,99,255,.25)' },
    { label: 'Active Clients',    value: String(activeCount), color: 'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow: 'rgba(255,107,157,.25)' },
    { label: 'Open Tasks',        value: String(openTasks),   color: 'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow: 'rgba(59,130,246,.25)'  },
    { label: 'New Requests',      value: String(pendingReqs.length), color: 'linear-gradient(135deg,#10B981,#059669)', shadow: 'rgba(16,185,129,.25)' },
  ]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F5F6FA', minHeight: '100dvh' }}>
      <style>{`
        .dash { max-width: 1080px; margin: 0 auto; padding: 24px 20px 60px; display: flex; flex-direction: column; gap: 24px; }
        .metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        @media(max-width:700px){ .metrics { grid-template-columns: 1fr 1fr; } }
        .dash-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        @media(max-width:900px){ .dash-grid { grid-template-columns: 1fr; } }
        .kanban { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
        .kanban::-webkit-scrollbar { height: 4px; } .kanban::-webkit-scrollbar-track { background: #F1F5F9; border-radius:2px; } .kanban::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius:2px; }
        .kb-col { width: 240px; flex-shrink: 0; }
        .card { background: #fff; border: 1px solid #E8EAF0; border-radius: 16px; overflow: hidden; }
        .card-head { padding: 16px 18px; border-bottom: 1px solid #F1F5F9; }
        .card-title { font-size: 16px; font-weight: 700; color: #0D0D1A; }
        .card-sub { font-size: 13px; color: #94A3B8; margin-top: 2px; }
        .client-row { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-bottom: 1px solid #F1F5F9; text-decoration: none; color: inherit; transition: background .12s; }
        .client-row:hover { background: #F8FAFC; }
        .task-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
        .task-row:last-child { border-bottom: none; }
        .anchor-nav { display: none; }
        @media(max-width:700px){ .anchor-nav { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E8EAF0; position: sticky; top: 0; z-index: 20; } }
        .anchor-nav::-webkit-scrollbar { display: none; }
        .anav-btn { flex-shrink: 0; padding: 7px 14px; border-radius: 999px; border: 1.5px solid #E8EAF0; background: #F8FAFC; color: #64748B; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; }
        .anav-btn:hover { border-color: #6C63FF; color: #6C63FF; background: #EEF0FF; }
        .section-wrap { scroll-margin-top: 56px; }
      `}</style>

      {/* ── TOP HEADER ── */}
      <div style={{ background: '#0F0F14', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>
              Orbit<span style={{ color: '#A78BFA' }}>Reach</span>
            </span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href="/admin/invoices" style={{ padding: '7px 14px', background: 'transparent', color: '#9CA3AF', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color='#fff')} onMouseLeave={e => (e.currentTarget.style.color='#9CA3AF')}>
              Invoices
            </a>
            <a href="/admin/proposals" style={{ padding: '7px 14px', background: 'transparent', color: '#9CA3AF', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color='#fff')} onMouseLeave={e => (e.currentTarget.style.color='#9CA3AF')}>
              Proposals
            </a>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.1)', margin: '0 4px' }}/>
            <a href="/admin/clients/new" style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 10px rgba(108,99,255,.35)' }}>
              + Add client
            </a>
            <a href="/login" style={{ padding: '7px 14px', background: 'rgba(255,255,255,.06)', color: '#9CA3AF', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', border: '1px solid rgba(255,255,255,.08)' }}>
              Sign out
            </a>
          </div>
        </div>
      </div>

      {/* ── ANCHOR NAV ── */}
      <div className="anchor-nav">
        {[
          { href: '#overview',  label: 'Overview'  },
          { href: '#clients',   label: `Clients (${clients.length})` },
          { href: '#tasks',     label: `Tasks (${openTasks} open)` },
          { href: '#requests',  label: `Requests${pendingReqs.length > 0 ? ` (${pendingReqs.length})` : ''}` },
          { href: '#revenue',   label: 'Revenue' },
        ].map(a => (
          <a key={a.href} href={a.href} className="anav-btn">{a.label}</a>
        ))}
      </div>

      <div className="dash">

        {/* ── METRICS ── */}
        <div id="overview" className="section-wrap">
          <div className="metrics">
            {metrics.map(m => (
              <div key={m.label} style={{ background: m.color, borderRadius: 16, padding: '18px 20px', boxShadow: `0 8px 24px ${m.shadow}`, minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -14, right: -14, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }}/>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: loading ? 24 : 32, fontWeight: 800, color: '#fff', letterSpacing: '-.03em', position: 'relative' }}>{loading ? '…' : m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CLIENTS ── */}
        <div id="clients" className="section-wrap">
          <div className="card">
            <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="card-title">Clients</div>
                <div className="card-sub">{clients.length} total</div>
              </div>
              <a href="/admin/clients/new" style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>+ Add</a>
            </div>
            {clients.length === 0 && !loading && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No clients yet</div>
                <a href="/admin/clients/new" style={{ color: '#6C63FF', fontSize: 14 }}>Add your first client →</a>
              </div>
            )}
            {clients.map((c, i) => {
              const pp = PILL[c.status] ?? PILL.pending
              const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
              return (
                <a key={c.id} href={`/admin/clients/${c.id}`} className="client-row">
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: AV_BG[i%4], color: AV_TEXT[i%4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{c.type}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: pp.bg, color: pp.color, flexShrink: 0 }}>{pp.label}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', flexShrink: 0, marginLeft: 8 }}>${c.monthly_retainer}<span style={{ fontSize: 11, fontWeight: 400, color: '#94A3B8' }}>/mo</span></div>
                  <svg style={{ width: 14, height: 14, flexShrink: 0, marginLeft: 4 }} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              )
            })}
          </div>
        </div>

        {/* ── TASKS KANBAN ── */}
        <div id="tasks" className="section-wrap">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Tasks</div>
              <div className="card-sub">Swipe to see all clients</div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              {clients.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 14 }}>Add a client to start tracking tasks.</div>}
              <div className="kanban">
                {clients.map((c, ci) => {
                  const ct = tasks.filter(t => t.client_id === c.id)
                  const open = ct.filter(t => !t.done)
                  const done = ct.filter(t => t.done)
                  const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
                  return (
                    <div key={c.id} className="kb-col">
                      <div style={{ background: '#fff', borderRadius: '10px 10px 0 0', border: '1px solid #E8EAF0', borderBottom: 'none', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: AV_BG[ci%4], color: AV_TEXT[ci%4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0D0D1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>{ct.length}</span>
                      </div>
                      <div style={{ height: 3, background: AV_TEXT[ci%4] }}/>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E8EAF0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 10, minHeight: 120 }}>
                        {open.map(t => (
                          <div key={t.id} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 9, padding: '9px 10px', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#EEF0FF', color: '#6C63FF' }}>{t.status}</span>
                              <div onClick={() => toggleTask(t)} style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #E8EAF0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                                <svg viewBox="0 0 24 24" style={{ width: 9, height: 9, opacity: .3 }} fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0D1A', lineHeight: 1.4 }}>{t.title}</div>
                          </div>
                        ))}
                        {done.map(t => (
                          <div key={t.id} style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 9, padding: '8px 10px', marginBottom: 7, opacity: .5, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div onClick={() => toggleTask(t)} style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #10B981', background: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" style={{ width: 9, height: 9 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <span style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'line-through' }}>{t.title}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input value={newTaskMap[c.id] ?? ''} onChange={e => setNewTaskMap(m => ({ ...m, [c.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addTask(c.id)} placeholder="+ Add task"
                            style={{ flex: 1, fontSize: 11, padding: '7px 9px', border: '1.5px dashed #E8EAF0', borderRadius: 7, background: 'transparent', outline: 'none', color: '#64748B' }}/>
                          <button onClick={() => addTask(c.id)} style={{ padding: '7px 10px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── REQUESTS + REVENUE ── */}
        <div id="requests" className="section-wrap dash-grid">

          {/* Requests */}
          <div className="card">
            <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="card-title">Requests</div>
                <div className="card-sub">{pendingReqs.length} pending · {requests.length} total</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {requests.some(r => r.file_url) && (
                  <button onClick={() => {
                    requests.filter(r => r.file_url).forEach((r, i) => {
                      setTimeout(() => {
                        const a = document.createElement('a')
                        a.href = r.file_url; a.download = ''; a.target = '_blank'
                        document.body.appendChild(a); a.click(); document.body.removeChild(a)
                      }, i * 400)
                    })
                  }} style={{ padding: '5px 12px', borderRadius: 999, border: '1.5px solid #E8EAF0', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    All files
                  </button>
                )}
                {(['pending', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setReqFilter(f)}
                    style={{ padding: '5px 12px', borderRadius: 999, border: `1.5px solid ${reqFilter === f ? '#6C63FF' : '#E8EAF0'}`, background: reqFilter === f ? '#EEF0FF' : '#F8FAFC', color: reqFilter === f ? '#6C63FF' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {f === 'pending' ? 'Pending' : 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '4px 0' }}>
              {visibleReqs.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  {reqFilter === 'pending' ? 'No pending requests 🎉' : 'No requests yet.'}
                </div>
              )}
              {visibleReqs.map(r => {
                const S: Record<string,{bg:string;color:string;label:string}> = {
                  pending:  {bg:'#FFFBEB',color:'#F59E0B',label:'Pending'},
                  accepted: {bg:'#ECFDF5',color:'#10B981',label:'Accepted'},
                  backlog:  {bg:'#EEF0FF',color:'#6C63FF',label:'Backlog'},
                  declined: {bg:'#FEF2F2',color:'#EF4444',label:'Declined'},
                }
                const s = S[r.status] ?? S.pending
                /* strip [📎 filename] from display title */
                const cleanTitle = r.title.replace(/\s*\[📎[^\]]*\]/g, '').trim()
                const hasFile = r.file_url || r.title.includes('[📎')
                return (
                  <div key={r.id} onClick={() => setSelectedReq(r)}
                    style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background='#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', lineHeight: 1.4 }}>{cleanTitle}</span>
                          {hasFile && (
                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.clients?.name} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Revenue */}
          <div id="revenue" className="section-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>Revenue</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'MRR', value: `$${mrr}`, color: 'linear-gradient(135deg,#6C63FF,#A855F7)', shadow: 'rgba(108,99,255,.2)' },
                  { label: 'Est. YTD', value: `$${mrr * 6 + clients.reduce((s,c) => s + (c.setup_fee??0), 0)}`, color: 'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow: 'rgba(59,130,246,.2)' },
                ].map(m => (
                  <div key={m.label} style={{ background: m.color, borderRadius: 12, padding: '14px 16px', boxShadow: `0 4px 16px ${m.shadow}` }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{loading ? '…' : m.value}</div>
                  </div>
                ))}
              </div>
              {clients.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[i%DOT.length], flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>${c.monthly_retainer}/mo · next: {c.next_payment ?? 'not set'}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0D1A', flexShrink: 0 }}>${(c.monthly_retainer ?? 0) * 3 + (c.setup_fee ?? 0)}</div>
                </div>
              ))}
              {clients.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>No revenue data yet.</div>}
            </div>
          </div>

        </div>
      </div>

      {/* ── REQUEST DETAIL MODAL ── */}
      {selectedReq && (() => {
        const r = selectedReq
        const ST: Record<string,{bg:string;color:string;label:string}> = {
          pending:  {bg:'#FFFBEB',color:'#F59E0B',label:'Pending'},
          accepted: {bg:'#ECFDF5',color:'#10B981',label:'Accepted'},
          backlog:  {bg:'#EEF0FF',color:'#6C63FF',label:'Backlog'},
          declined: {bg:'#FEF2F2',color:'#EF4444',label:'Declined'},
        }
        const st = ST[r.status] ?? ST.pending
        const cleanTitle = r.title.replace(/\s*\[📎[^\]]*\]/g, '').trim()
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(13,11,26,.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => e.target === e.currentTarget && setSelectedReq(null)}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,.18)', border: '1px solid #E8EAF0', overflow: 'hidden' }}>

              {/* Modal header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{r.clients?.name} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <button onClick={() => setSelectedReq(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5F6FA', border: '1px solid #E8EAF0', color: '#94A3B8', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Modal body */}
              <div style={{ padding: '22px 24px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A', marginBottom: 12, lineHeight: 1.4 }}>{cleanTitle}</div>

                {r.description && (
                  <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 16, background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                    {r.description}
                  </div>
                )}

                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6C63FF', fontWeight: 600, marginBottom: 14, textDecoration: 'none' }}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    {r.link}
                  </a>
                )}

                {r.file_url && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <a href={r.file_url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6C63FF', fontWeight: 600, background: '#EEF0FF', padding: '10px 14px', borderRadius: 10, textDecoration: 'none' }}>
                      <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                      View file
                    </a>
                    <a href={r.file_url} download style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', fontWeight: 600, background: '#F8FAFC', padding: '10px 14px', borderRadius: 10, textDecoration: 'none', border: '1px solid #E8EAF0' }}>
                      <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </a>
                  </div>
                )}

                {/* Action buttons */}
                {r.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={() => { updateReq(r.id, 'accepted', r.client_id, r.title); setSelectedReq({ ...r, status: 'accepted' }) }}
                      style={{ flex: 1, padding: '12px', background: '#ECFDF5', color: '#10B981', border: '1.5px solid rgba(16,185,129,.2)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✓ Accept</button>
                    <button onClick={() => { updateReq(r.id, 'backlog', r.client_id, r.title); setSelectedReq({ ...r, status: 'backlog' }) }}
                      style={{ flex: 1, padding: '12px', background: '#EEF0FF', color: '#6C63FF', border: '1.5px solid rgba(108,99,255,.2)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>📋 Backlog</button>
                    <button onClick={() => { updateReq(r.id, 'declined', r.client_id, r.title); setSelectedReq({ ...r, status: 'declined' }) }}
                      style={{ flex: 1, padding: '12px', background: '#FEF2F2', color: '#EF4444', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✕ Decline</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {r.status !== 'accepted' && <button onClick={() => { updateReq(r.id, 'accepted', r.client_id, r.title); setSelectedReq({ ...r, status: 'accepted' }) }} style={{ flex: 1, padding: '11px', background: '#ECFDF5', color: '#10B981', border: '1.5px solid rgba(16,185,129,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Accept</button>}
                    {r.status !== 'backlog'   && <button onClick={() => { updateReq(r.id, 'backlog',   r.client_id, r.title); setSelectedReq({ ...r, status: 'backlog'   }) }} style={{ flex: 1, padding: '11px', background: '#EEF0FF', color: '#6C63FF', border: '1.5px solid rgba(108,99,255,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 Backlog</button>}
                    {r.status !== 'declined'  && <button onClick={() => { updateReq(r.id, 'declined',  r.client_id, r.title); setSelectedReq({ ...r, status: 'declined'  }) }} style={{ flex: 1, padding: '11px', background: '#FEF2F2', color: '#EF4444', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ Decline</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
