'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const AV_BG   = ['#ECFDF5','#EEF0FF','#FFFBEB','#EFF6FF']
const AV_TEXT = ['#10B981','#6C63FF','#92400E','#3B82F6']
const AV_BORDER = ['#10B981','#6C63FF','#F59E0B','#3B82F6']

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  backlog:     { bg: '#EEF0FF', color: '#6C63FF' },
  in_progress: { bg: '#FFFBEB', color: '#F59E0B' },
  in_review:   { bg: '#FFFBEB', color: '#F59E0B' },
  done:        { bg: '#ECFDF5', color: '#10B981' },
}

export default function TasksPage() {
  const [clients, setClients] = useState<any[]>([])
  const [tasks, setTasks]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at'),
    ]).then(([c, t]) => {
      setClients(c.data ?? [])
      setTasks(t.data ?? [])
      setLoading(false)
    })
  }, [])

  async function addTask(clientId: string) {
    const title = (adding[clientId] ?? '').trim()
    if (!title) return
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert({ client_id: clientId, title, done: false, status: 'backlog' }).select().single()
    if (data) setTasks(t => [...t, data])
    setAdding(a => ({ ...a, [clientId]: '' }))
  }

  async function toggleTask(task: any) {
    const supabase = createClient()
    const done = !task.done
    await supabase.from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading…</div>

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .tasks-header { padding:14px 24px; border-bottom:1px solid #E8EAF0; background:#fff; position:sticky; top:0; z-index:10; }
        .tasks-body { padding:20px 24px; overflow-x:auto; }
        .kanban-wrap { display:flex; gap:16px; align-items:flex-start; min-width:max-content; }
        .kb-col { width:260px; flex-shrink:0; }
        @media(max-width:768px){
          .tasks-header { padding:12px 16px; }
          .tasks-body { padding:12px; }
          .kb-col { width:240px; }
        }
      `}</style>
      <div className="tasks-header">
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Studio / Tasks</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>Tasks</div>
      </div>
      <div className="tasks-body">
        {clients.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tasks yet</div>
            <div style={{ fontSize: 14, color: '#94A3B8' }}>Tasks appear here once you add clients. <a href="/admin/clients/new" style={{ color: '#6C63FF' }}>Add one →</a></div>
          </div>
        )}
        <div className="kanban-wrap">
          {clients.map((c, ci) => {
            const clientTasks = tasks.filter(t => t.client_id === c.id)
            const open = clientTasks.filter(t => !t.done)
            const done = clientTasks.filter(t => t.done)
            const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
            return (
              <div key={c.id} className="kb-col">
                <div style={{ background: '#fff', borderRadius: '12px 12px 0 0', border: '1px solid #E8EAF0', borderBottom: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: AV_BG[ci%4], color: AV_TEXT[ci%4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 999 }}>{clientTasks.length}</span>
                </div>
                <div style={{ height: 3, background: AV_BORDER[ci%4] }}/>
                <div style={{ background: '#F8FAFC', border: '1px solid #E8EAF0', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12, minHeight: 160 }}>
                  {open.map(t => {
                    const sc = STATUS_STYLE[t.status] ?? STATUS_STYLE.backlog
                    return (
                      <div key={t.id} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{t.status}</span>
                          <div onClick={() => toggleTask(t)} style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #E8EAF0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#F8FAFC' }} title="Mark done">
                            <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, opacity: .3 }} fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0D0D1A', lineHeight: 1.4 }}>{t.title}</div>
                      </div>
                    )
                  })}
                  {done.map(t => (
                    <div key={t.id} style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 12px', marginBottom: 8, opacity: .5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div onClick={() => toggleTask(t)} style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #10B981', background: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through', lineHeight: 1.4 }}>{t.title}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input value={adding[c.id] ?? ''} onChange={e => setAdding(a => ({ ...a, [c.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask(c.id)} placeholder="+ Add task"
                      style={{ flex: 1, fontSize: 12, padding: '8px 10px', border: '1.5px dashed #E8EAF0', borderRadius: 8, background: 'transparent', outline: 'none', color: '#64748B' }}/>
                    <button onClick={() => addTask(c.id)} style={{ padding: '8px 12px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
