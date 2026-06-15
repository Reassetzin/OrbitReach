'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'
import { useParams } from 'next/navigation'

const STATUS_META: Record<string, {bg:string,color:string,label:string}> = {
  active:  { bg:'#ECFDF5', color:'#10B981', label:'Active'    },
  review:  { bg:'#FFFBEB', color:'#F59E0B', label:'In Review' },
  pending: { bg:'#F5F6FA', color:'#64748B', label:'Pending'   },
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tasks')
  const [newTask, setNewTask] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [editStatus, setEditStatus] = useState('')

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('client_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('client_id', id).order('created_at'),
      supabase.from('requests').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]).then(([c, t, m, r]) => {
      setClient(c.data)
      setEditStatus(c.data?.status ?? 'pending')
      setTasks(t.data ?? [])
      setMessages(m.data ?? [])
      setRequests(r.data ?? [])
      setLoading(false)
    })
  }, [id])

  async function addTask() {
    if (!newTask.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert({ client_id: id, title: newTask.trim(), done: false, status: 'backlog' }).select().single()
    if (data) setTasks(t => [...t, data])
    setNewTask('')
    setSaving(false)
  }

  async function toggleTask(task: any) {
    const supabase = createClient()
    await supabase.from('tasks').update({ done: !task.done, status: !task.done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done: !x.done } : x))
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('messages').insert({ client_id: id, from_admin: true, text: newMsg.trim() }).select().single()
    if (data) setMessages(m => [...m, data])
    setNewMsg('')
    setSaving(false)
  }

  async function updateStatus(status: string) {
    setEditStatus(status)
    const supabase = createClient()
    await supabase.from('clients').update({ status }).eq('id', id as string)
    setClient((c: any) => ({ ...c, status }))
  }

  async function acceptRequest(req: any) {
    const supabase = createClient()
    await supabase.from('requests').update({ status: 'accepted' }).eq('id', req.id)
    await supabase.from('tasks').insert({ client_id: id, title: req.title, done: false, status: 'in_progress' })
    setRequests(r => r.map(x => x.id === req.id ? { ...x, status: 'accepted' } : x))
    const { data } = await supabase.from('tasks').select('*').eq('client_id', id).order('created_at')
    if (data) setTasks(data)
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#94A3B8', fontFamily:'Inter,sans-serif' }}>Loading…</div>
  if (!client) return <div style={{ padding:48, textAlign:'center', color:'#EF4444', fontFamily:'Inter,sans-serif' }}>Client not found.</div>

  const p = STATUS_META[client.status] ?? STATUS_META.pending
  const TABS = ['tasks','requests','messages','billing']

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8', marginBottom:4 }}>
          <a href="/admin/clients" style={{ color:'#6C63FF', textDecoration:'none' }}>← Clients</a>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>{client.name}</div>
          <span style={{ fontSize:11, fontWeight:600, padding:'3px 12px', borderRadius:999, background:p.bg, color:p.color }}>{p.label}</span>
        </div>
        <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{client.type} · ${client.monthly_retainer}/mo · {client.email}</div>
      </div>

      {/* Status changer */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E8EAF0', padding:'10px 32px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#94A3B8', marginRight:8 }}>Status:</span>
        {(['active','review','pending'] as const).map(s => (
          <button key={s} onClick={() => updateStatus(s)}
            style={{ padding:'5px 14px', borderRadius:999, border:`1.5px solid ${editStatus===s?'#6C63FF':'#E8EAF0'}`, background:editStatus===s?'#EEF0FF':'#fff', color:editStatus===s?'#6C63FF':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {s==='active'?'Active':s==='review'?'In Review':'Pending'}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E8EAF0', padding:'0 32px', display:'flex' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 16px', border:'none', borderBottom:`2px solid ${tab===t?'#6C63FF':'transparent'}`, background:'transparent', fontSize:13, fontWeight:tab===t?600:400, color:tab===t?'#6C63FF':'#94A3B8', cursor:'pointer', textTransform:'capitalize' as const }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding:'24px 32px', maxWidth:800 }}>

        {/* TASKS */}
        {tab === 'tasks' && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Tasks ({tasks.filter(t=>!t.done).length} open)</div>
            {tasks.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #E8EAF0' }}>
                <div onClick={() => toggleTask(t)} style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${t.done?'#6C63FF':'#E8EAF0'}`, background:t.done?'#6C63FF':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {t.done && <svg viewBox="0 0 24 24" style={{ width:10, height:10 }} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex:1, fontSize:13, color: t.done ? '#94A3B8' : '#0D0D1A', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#EEF0FF', color:'#6C63FF' }}>{t.status}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key==='Enter' && addTask()} placeholder="Add a task…"
                style={{ flex:1, fontSize:13, padding:'8px 12px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none' }}/>
              <button onClick={addTask} disabled={saving} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Add</button>
            </div>
          </div>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Requests ({requests.length})</div>
            {requests.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:32 }}>No requests yet.</div>}
            {requests.map(r => {
              const rs: Record<string,{bg:string,color:string}> = { pending:{bg:'#FFFBEB',color:'#F59E0B'}, accepted:{bg:'#ECFDF5',color:'#10B981'}, declined:{bg:'#FEF2F2',color:'#EF4444'}, backlog:{bg:'#EEF0FF',color:'#6C63FF'} }
              const rp = rs[r.status] ?? rs.pending
              return (
                <div key={r.id} style={{ padding:'14px', background:'#F5F6FA', borderRadius:10, marginBottom:10, border:'1px solid #E8EAF0' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>{r.title}</div>
                      {r.description && <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>{r.description}</div>}
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:999, background:rp.bg, color:rp.color, flexShrink:0 }}>{r.status}</span>
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button onClick={() => acceptRequest(r)} style={{ padding:'5px 14px', background:'#ECFDF5', color:'#10B981', border:'1px solid rgba(16,185,129,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✓ Accept & add to tasks</button>
                      <button onClick={async () => { const s = createClient(); await s.from('requests').update({status:'declined'}).eq('id',r.id); setRequests(x => x.map(q => q.id===r.id?{...q,status:'declined'}:q)) }} style={{ padding:'5px 14px', background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✕ Decline</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Messages</div>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:12, marginBottom:16, maxHeight:400, overflowY:'auto' }}>
              {messages.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:32 }}>No messages yet.</div>}
              {messages.map(m => (
                <div key={m.id} style={{ padding:'10px 14px', background: m.from_admin ? '#EEF0FF' : '#F5F6FA', borderRadius:10, maxWidth:'80%', alignSelf: m.from_admin ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize:11, fontWeight:600, color: m.from_admin ? '#6C63FF' : '#64748B', marginBottom:4 }}>{m.from_admin ? 'You' : client.name}</div>
                  <div style={{ fontSize:13, color:'#0D0D1A' }}>{m.text}</div>
                  <div style={{ fontSize:10, color:'#94A3B8', marginTop:4 }}>{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="Write a message…"
                style={{ flex:1, fontSize:13, padding:'8px 12px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none' }}/>
              <button onClick={sendMessage} disabled={saving} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Send</button>
            </div>
          </div>
        )}

        {/* BILLING */}
        {tab === 'billing' && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Billing</div>
            {[
              ['Contact', client.contact ?? '—'],
              ['Email', client.email],
              ['Service', client.type],
              ['Setup fee', client.setup_fee > 0 ? `$${client.setup_fee} (one-time)` : '—'],
              ['Monthly retainer', `$${client.monthly_retainer}/mo`],
              ['Monthly revisions', client.monthly_revisions ?? 5],
              ['Revisions used', client.revisions_used ?? 0],
              ['Next payment', client.next_payment ?? 'Not set'],
              ['Status', p.label],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #E8EAF0' }}>
                <span style={{ fontSize:12, color:'#64748B' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>{value as string}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
