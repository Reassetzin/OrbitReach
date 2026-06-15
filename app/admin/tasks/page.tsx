'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const STATUS_COLORS: Record<string, {bg:string,color:string}> = {
  backlog:     { bg:'#EEF0FF', color:'#6C63FF' },
  in_progress: { bg:'#FFFBEB', color:'#F59E0B' },
  in_review:   { bg:'#FFFBEB', color:'#F59E0B' },
  done:        { bg:'#ECFDF5', color:'#10B981' },
}
const AV_COLORS = ['#ECFDF5','#EEF0FF','#FFFBEB','#EFF6FF']
const AV_TEXT   = ['#10B981','#6C63FF','#92400E','#3B82F6']

export default function TasksPage() {
  const [clients, setClients] = useState<any[]>([])
  const [tasks, setTasks]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState<Record<string,string>>({})

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
    const title = adding[clientId]?.trim()
    if (!title) return
    const supabase = createClient()
    const { data } = await supabase.from('tasks')
      .insert({ client_id: clientId, title, done: false, status: 'backlog' })
      .select().single()
    if (data) setTasks(t => [...t, data])
    setAdding(a => ({ ...a, [clientId]: '' }))
  }

  async function toggleTask(task: any) {
    const supabase = createClient()
    const done = !task.done
    await supabase.from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#94A3B8', fontFamily:'Inter,sans-serif' }}>Loading…</div>

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Tasks</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Tasks</div>
      </div>

      {clients.length === 0 ? (
        <div style={{ padding:48, textAlign:'center', color:'#94A3B8' }}>No clients yet. <a href="/admin/clients/new" style={{ color:'#6C63FF' }}>Add one →</a></div>
      ) : (
        <div style={{ padding:'24px 32px', overflowX:'auto' }}>
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', minWidth: clients.length * 280 }}>
            {clients.map((c, i) => {
              const clientTasks = tasks.filter(t => t.client_id === c.id)
              const open = clientTasks.filter(t => !t.done)
              const done = clientTasks.filter(t => t.done)
              const initials = c.name.split(' ').slice(0,2).map((w:string) => w[0]).join('').toUpperCase()
              return (
                <div key={c.id} style={{ width:260, flexShrink:0 }}>
                  {/* Column header */}
                  <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:'10px 10px 0 0', padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:AV_COLORS[i%4], color:AV_TEXT[i%4], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>{initials}</div>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0D0D1A', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize:11, fontWeight:600, background:'#E8EAF0', color:'#64748B', padding:'2px 8px', borderRadius:999 }}>{clientTasks.length}</span>
                  </div>
                  <div style={{ height:3, background:AV_TEXT[i%4] }}/>
                  {/* Tasks */}
                  <div style={{ background:'#F5F6FA', border:'1px solid #E8EAF0', borderTop:'none', borderRadius:'0 0 10px 10px', padding:10, minHeight:160 }}>
                    {open.map(t => {
                      const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.backlog
                      return (
                        <div key={t.id} style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:8, padding:10, marginBottom:8 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:sc.bg, color:sc.color }}>{t.status}</span>
                            <div onClick={() => toggleTask(t)} style={{ width:16, height:16, borderRadius:4, border:'1.5px solid #E8EAF0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} title="Mark done"/>
                          </div>
                          <div style={{ fontSize:12, fontWeight:500, color:'#0D0D1A', lineHeight:1.4 }}>{t.title}</div>
                        </div>
                      )
                    })}
                    {done.map(t => (
                      <div key={t.id} style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:8, padding:10, marginBottom:8, opacity:.5 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#ECFDF5', color:'#10B981' }}>done</span>
                          <div onClick={() => toggleTask(t)} style={{ width:16, height:16, borderRadius:4, border:'1.5px solid #10B981', background:'#10B981', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg viewBox="0 0 24 24" style={{ width:9, height:9 }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:'#94A3B8', textDecoration:'line-through' }}>{t.title}</div>
                      </div>
                    ))}
                    {/* Add task */}
                    <div style={{ display:'flex', gap:6, marginTop:4 }}>
                      <input
                        value={adding[c.id] ?? ''}
                        onChange={e => setAdding(a => ({ ...a, [c.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addTask(c.id)}
                        placeholder="+ Add task"
                        style={{ flex:1, fontSize:11, padding:'6px 10px', border:'1.5px dashed #E8EAF0', borderRadius:6, background:'transparent', outline:'none', color:'#64748B' }}
                      />
                      <button onClick={() => addTask(c.id)} style={{ padding:'6px 10px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>Add</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
