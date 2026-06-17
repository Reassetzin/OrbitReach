'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const PILL: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#ECFDF5', color: '#10B981', label: 'Active'    },
  review:  { bg: '#FFFBEB', color: '#F59E0B', label: 'In Review' },
  pending: { bg: '#F5F6FA', color: '#64748B', label: 'Pending'   },
}
const AV_BG   = ['#EEF0FF','#ECFDF5','#FFFBEB','#EFF6FF','#FDF4FF']
const AV_TEXT = ['#6C63FF','#10B981','#92400E','#3B82F6','#A855F7']
const DOT     = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444']

export default function AdminDashboard() {
  const [clients, setClients]       = useState<any[]>([])
  const [tasks, setTasks]           = useState<any[]>([])
  const [requests, setRequests]     = useState<any[]>([])
  const [messages, setMessages]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [newTaskMap, setNewTaskMap]  = useState<Record<string,string>>({})
  const [reqFilter, setReqFilter]   = useState<'pending'|'all'>('pending')
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('client_tasks').select('*').order('created_at'),
      supabase.from('requests').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
    ]).then(([c, t, r, m]) => {
      setClients(c.data ?? [])
      setTasks(t.data ?? [])
      setRequests(r.data ?? [])
      setMessages(m.data ?? [])
      setLoading(false)
    })
  }, [])

  async function toggleTask(task: any) {
    const done = !task.done
    await createClient().from('client_tasks').update({ done }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done } : x))
  }

  async function addTask(clientId: string) {
    const title = (newTaskMap[clientId] ?? '').trim()
    if (!title) return
    const { data } = await createClient().from('client_tasks').insert({ client_id: clientId, title, done: false, type: 'text', emoji: '📝' }).select().single()
    if (data) setTasks(t => [...t, data])
    setNewTaskMap(m => ({ ...m, [clientId]: '' }))
  }

  async function updateReq(id: string, status: string, clientId: string, title: string) {
    await createClient().from('requests').update({ status }).eq('id', id)
    if (status === 'accepted') {
      const exists = tasks.some(t => t.client_id === clientId && t.title === title)
      if (!exists) {
        const { data } = await createClient().from('client_tasks').insert({ client_id: clientId, title, done: false, type: 'text', emoji: '🔧' }).select().single()
        if (data) setTasks(t => [...t, data])
      }
    }
    setRequests(r => r.map(x => x.id === id ? { ...x, status } : x))
  }

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const mrr         = clients.reduce((s, c) => s + (c.monthly_retainer ?? 0), 0)
  const activeCount = clients.filter(c => c.status === 'active').length
  const openTasks   = tasks.filter(t => !t.done).length
  const pendingReqs = requests.filter(r => r.status === 'pending')
  const visibleReqs = reqFilter === 'pending' ? pendingReqs : requests
  const unread      = messages.filter(m => !m.from_admin).length

  const navItems = [
    { id: 'overview',  label: 'Overview',  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'clients',   label: 'Clients',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', badge: clients.length },
    { id: 'tasks',     label: 'Tasks',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', badge: openTasks > 0 ? openTasks : null },
    { id: 'requests',  label: 'Requests',  icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', badge: pendingReqs.length > 0 ? pendingReqs.length : null, badgeColor: '#EF4444' },
    { id: 'revenue',   label: 'Revenue',   icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F0F2F8', minHeight: '100dvh', display: 'flex' }}>
      <style>{`
        * { box-sizing: border-box; }

        /* ── SIDEBAR ── */
        .sidebar { width: 240px; min-height: 100dvh; background: #0F0F14; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 50; }
        .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,.06); }
        .sidebar-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background .15s; color: #6B7280; font-size: 14px; font-weight: 500; border: none; background: none; width: 100%; text-align: left; position: relative; text-decoration: none; }
        .nav-item:hover { background: rgba(255,255,255,.06); color: #E5E7EB; }
        .nav-item.active { background: rgba(108,99,255,.2); color: #A78BFA; }
        .nav-item svg { flex-shrink: 0; opacity: .75; }
        .nav-item.active svg { opacity: 1; }
        .nav-badge { margin-left: auto; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: rgba(108,99,255,.25); color: #A78BFA; }
        .nav-badge.red { background: rgba(239,68,68,.2); color: #F87171; }
        .sidebar-footer { padding: 12px 10px; border-top: 1px solid rgba(255,255,255,.06); }

        /* ── MAIN ── */
        .main { margin-left: 240px; flex: 1; min-height: 100dvh; display: flex; flex-direction: column; }
        .topbar { background: #fff; border-bottom: 1px solid #E8EAF0; padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; }
        .page-content { padding: 28px; display: flex; flex-direction: column; gap: 24px; }

        /* ── CARDS ── */
        .card { background: #fff; border: 1px solid #E8EAF0; border-radius: 16px; overflow: hidden; }
        .card-head { padding: 18px 22px; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-size: 15px; font-weight: 700; color: #0D0D1A; }
        .card-sub { font-size: 13px; color: #94A3B8; margin-top: 2px; }

        /* ── GRIDS ── */
        .metrics-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .two-col { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start; }
        .three-col { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; align-items: start; }

        /* ── CLIENT TABLE ── */
        .client-table { width: 100%; border-collapse: collapse; }
        .client-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94A3B8; padding: 10px 22px; text-align: left; background: #F8FAFC; border-bottom: 1px solid #F1F5F9; }
        .client-table td { padding: 14px 22px; border-bottom: 1px solid #F1F5F9; font-size: 14px; color: #0D0D1A; vertical-align: middle; }
        .client-table tr:last-child td { border-bottom: none; }
        .client-table tr:hover td { background: #F8FAFC; cursor: pointer; }

        /* ── KANBAN ── */
        .kanban { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E8EAF0; border-radius: 3px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>Orbit<span style={{ color: '#A78BFA' }}>Reach</span></div>
              <div style={{ fontSize: 11, color: '#4B4869', marginTop: 2 }}>Studio Admin</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <a key={item.id} href={`#${item.id}`} className={`nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => setActiveSection(item.id)}>
              <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              {item.label}
              {item.badge != null && (
                <span className={`nav-badge${item.badgeColor ? ' red' : ''}`}>{item.badge}</span>
              )}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/admin/clients/new" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', marginBottom: 6 }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add client
          </a>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#4B4869', cursor: 'pointer', width: '100%' }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A', letterSpacing: '-.01em' }}>
              {navItems.find(n => n.id === activeSection)?.label ?? 'Dashboard'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {unread > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: '#FEF2F2', color: '#EF4444' }}>
                {unread} unread message{unread > 1 ? 's' : ''}
              </div>
            )}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              OR
            </div>
          </div>
        </div>

        <div className="page-content">

          {/* ── OVERVIEW / METRICS ── */}
          <div id="overview" style={{ scrollMarginTop: 80 }}>
            <div className="metrics-grid">
              {[
                { label: 'Monthly Recurring', value: `$${mrr.toLocaleString()}`, sub: `${activeCount} active clients`, grad: 'linear-gradient(135deg,#6C63FF,#A855F7)', sh: 'rgba(108,99,255,.2)' },
                { label: 'Open Tasks',         value: String(openTasks),          sub: `${tasks.length} total tasks`,     grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)', sh: 'rgba(59,130,246,.2)' },
                { label: 'Pending Requests',   value: String(pendingReqs.length), sub: `${requests.length} total`,        grad: 'linear-gradient(135deg,#F59E0B,#EF4444)', sh: 'rgba(245,158,11,.2)' },
                { label: 'Est. Annual Rev.',   value: `$${(mrr * 12).toLocaleString()}`, sub: 'based on current MRR', grad: 'linear-gradient(135deg,#10B981,#059669)', sh: 'rgba(16,185,129,.2)' },
              ].map(m => (
                <div key={m.label} style={{ background: m.grad, borderRadius: 16, padding: '20px 22px', boxShadow: `0 8px 24px ${m.sh}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }}/>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-.03em', lineHeight: 1 }}>{loading ? '…' : m.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CLIENTS TABLE ── */}
          <div id="clients" style={{ scrollMarginTop: 80 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Clients</div>
                  <div className="card-sub">{clients.length} total · ${mrr}/mo MRR</div>
                </div>
                <a href="/admin/clients/new" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  + Add client
                </a>
              </div>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
              ) : clients.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>👥</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A', marginBottom: 6 }}>No clients yet</div>
                  <a href="/admin/clients/new" style={{ color: '#6C63FF', fontSize: 14 }}>Add your first client →</a>
                </div>
              ) : (
                <table className="client-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>MRR</th>
                      <th>Next payment</th>
                      <th>Tasks</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => {
                      const pp   = PILL[c.status] ?? PILL.pending
                      const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
                      const ct   = tasks.filter(t => t.client_id === c.id)
                      const open = ct.filter(t => !t.done).length
                      return (
                        <tr key={c.id} onClick={() => window.location.href = `/admin/clients/${c.id}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: AV_BG[i%5], color: AV_TEXT[i%5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0D0D1A' }}>{c.name}</div>
                                <div style={{ fontSize: 12, color: '#94A3B8' }}>{c.email ?? '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td><span style={{ fontSize: 12, color: '#64748B' }}>{c.type}</span></td>
                          <td><span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: pp.bg, color: pp.color }}>{pp.label}</span></td>
                          <td style={{ fontWeight: 700 }}>${c.monthly_retainer}<span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8' }}>/mo</span></td>
                          <td style={{ fontSize: 13, color: '#64748B' }}>{c.next_payment ?? '—'}</td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: open > 0 ? '#6C63FF' : '#10B981' }}>
                              {open > 0 ? `${open} open` : 'All done ✓'}
                            </span>
                          </td>
                          <td>
                            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── TASKS KANBAN ── */}
          <div id="tasks" style={{ scrollMarginTop: 80 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Tasks</div>
                  <div className="card-sub">{openTasks} open · {tasks.filter(t=>t.done).length} completed</div>
                </div>
              </div>
              <div style={{ padding: '20px 22px' }}>
                {clients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>Add a client to start tracking tasks.</div>
                ) : (
                  <div className="kanban">
                    {clients.map((c, ci) => {
                      const ct   = tasks.filter(t => t.client_id === c.id)
                      const open = ct.filter(t => !t.done)
                      const done = ct.filter(t => t.done)
                      const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
                      return (
                        <div key={c.id} style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EAF0', overflow: 'hidden' }}>
                          {/* Column header */}
                          <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '2px solid ' + AV_TEXT[ci%5], display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: AV_BG[ci%5], color: AV_TEXT[ci%5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{init}</div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{ct.length}</span>
                          </div>
                          {/* Tasks */}
                          <div style={{ padding: 10, minHeight: 100 }}>
                            {open.map(t => (
                              <div key={t.id} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <div onClick={() => toggleTask(t)} style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, background: '#F8FAFC' }}/>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0D0D1A', lineHeight: 1.4 }}>{t.title}</span>
                                </div>
                              </div>
                            ))}
                            {done.map(t => (
                              <div key={t.id} style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 10, padding: '9px 12px', marginBottom: 8, opacity: .55, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div onClick={() => toggleTask(t)} style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #10B981', background: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg viewBox="0 0 24 24" style={{ width: 9, height: 9 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <span style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through' }}>{t.title}</span>
                              </div>
                            ))}
                            {/* Add task input */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <input value={newTaskMap[c.id] ?? ''} onChange={e => setNewTaskMap(m => ({ ...m, [c.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addTask(c.id)} placeholder="+ Add task…"
                                style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: '1.5px dashed #E8EAF0', borderRadius: 8, background: 'transparent', outline: 'none', color: '#64748B' }}/>
                              <button onClick={() => addTask(c.id)} style={{ padding: '7px 10px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── REQUESTS + REVENUE side by side ── */}
          <div id="requests" style={{ scrollMarginTop: 80 }} className="two-col">

            {/* Requests */}
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Requests</div>
                  <div className="card-sub">{pendingReqs.length} pending · {requests.length} total</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['pending','all'] as const).map(f => (
                    <button key={f} onClick={() => setReqFilter(f)}
                      style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${reqFilter === f ? '#6C63FF' : '#E8EAF0'}`, background: reqFilter === f ? '#EEF0FF' : '#F8FAFC', color: reqFilter === f ? '#6C63FF' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {f === 'pending' ? 'Pending' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {visibleReqs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                    {reqFilter === 'pending' ? 'No pending requests 🎉' : 'No requests yet.'}
                  </div>
                ) : visibleReqs.map(r => {
                  const S: Record<string,any> = {
                    pending:  { bg:'#FFFBEB', color:'#F59E0B', label:'Pending'  },
                    accepted: { bg:'#ECFDF5', color:'#10B981', label:'Accepted' },
                    backlog:  { bg:'#EEF0FF', color:'#6C63FF', label:'Backlog'  },
                    declined: { bg:'#FEF2F2', color:'#EF4444', label:'Declined' },
                  }
                  const s = S[r.status] ?? S.pending
                  return (
                    <div key={r.id} style={{ padding: '16px 22px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: r.status === 'pending' ? 12 : 0 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A', marginBottom: 3, lineHeight: 1.4 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.clients?.name} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          {r.description && <div style={{ fontSize: 13, color: '#64748B', marginTop: 5, lineHeight: 1.5 }}>{r.description}</div>}
                          {r.file_url && <a href={r.file_url} target="_blank" style={{ fontSize: 12, color: '#6C63FF', display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>📎 View attachment</a>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0, height: 'fit-content' }}>{s.label}</span>
                      </div>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => updateReq(r.id,'accepted',r.client_id,r.title)} style={{ flex:1, padding:'8px', background:'#ECFDF5', color:'#10B981', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>✓ Accept</button>
                          <button onClick={() => updateReq(r.id,'backlog',r.client_id,r.title)} style={{ flex:1, padding:'8px', background:'#EEF0FF', color:'#6C63FF', border:'1px solid rgba(108,99,255,.2)', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>📋 Backlog</button>
                          <button onClick={() => updateReq(r.id,'declined',r.client_id,r.title)} style={{ flex:1, padding:'8px', background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>✕ Decline</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Revenue sidebar */}
            <div id="revenue" style={{ scrollMarginTop: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 22 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>Revenue</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'MRR',        value: `$${mrr.toLocaleString()}`,         grad: 'linear-gradient(135deg,#6C63FF,#A855F7)' },
                    { label: 'Annual est.',value: `$${(mrr*12).toLocaleString()}`,     grad: 'linear-gradient(135deg,#10B981,#059669)' },
                  ].map(m => (
                    <div key={m.label} style={{ background: m.grad, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{loading ? '…' : m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {clients.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[i%DOT.length], flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Next: {c.next_payment ?? '—'}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D1A' }}>${c.monthly_retainer}<span style={{ fontSize: 11, fontWeight: 400, color: '#94A3B8' }}>/mo</span></div>
                    </div>
                  ))}
                  {clients.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>No revenue data yet.</div>}
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
