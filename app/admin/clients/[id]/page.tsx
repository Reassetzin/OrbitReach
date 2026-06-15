'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'
import { useParams } from 'next/navigation'

const STATUS_META: Record<string, {bg:string,color:string,label:string}> = {
  active:  { bg:'#ECFDF5', color:'#10B981', label:'Active'    },
  review:  { bg:'#FFFBEB', color:'#F59E0B', label:'In Review' },
  pending: { bg:'#F5F6FA', color:'#64748B', label:'Pending'   },
}
const TASK_TYPES = ['file','text','review'] as const
const TASK_EMOJIS = ['📎','📝','🔍','🖼️','✅','📋','💬','🔗']

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient]         = useState<any>(null)
  const [tasks, setTasks]           = useState<any[]>([])
  const [clientTasks, setClientTasks] = useState<any[]>([])
  const [messages, setMessages]     = useState<any[]>([])
  const [requests, setRequests]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('tasks')
  const [newTask, setNewTask]       = useState('')
  const [newMsg, setNewMsg]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [progressStep, setProgressStep] = useState(1)
  // new client task form
  const [ctForm, setCtForm] = useState({ emoji:'📋', title:'', description:'', type:'text' as typeof TASK_TYPES[number] })
  const [showCtForm, setShowCtForm] = useState(false)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('client_id', id).order('created_at'),
      supabase.from('client_tasks').select('*').eq('client_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('client_id', id).order('created_at'),
      supabase.from('requests').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]).then(([c, t, ct, m, r]) => {
      setClient(c.data); setEditStatus(c.data?.status ?? 'pending'); setProgressStep(c.data?.progress_step ?? 1)
      setTasks(t.data ?? []); setClientTasks(ct.data ?? [])
      setMessages(m.data ?? []); setRequests(r.data ?? [])
      setLoading(false)
    })
  }, [id])

  async function addTask() {
    if (!newTask.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert({ client_id: id, title: newTask.trim(), done: false, status: 'backlog' }).select().single()
    if (data) setTasks(t => [...t, data])
    setNewTask(''); setSaving(false)
  }

  async function toggleTask(task: any) {
    const supabase = createClient()
    const done = !task.done
    await supabase.from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  async function addClientTask() {
    if (!ctForm.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('client_tasks').insert({
      client_id: id, emoji: ctForm.emoji, title: ctForm.title.trim(),
      description: ctForm.description.trim(), type: ctForm.type, done: false
    }).select().single()
    if (data) setClientTasks(t => [...t, data])
    setCtForm({ emoji:'📋', title:'', description:'', type:'text' })
    setShowCtForm(false); setSaving(false)
  }

  async function deleteClientTask(ctId: string) {
    const supabase = createClient()
    await supabase.from('client_tasks').delete().eq('id', ctId)
    setClientTasks(t => t.filter(x => x.id !== ctId))
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('messages').insert({ client_id: id, from_admin: true, text: newMsg.trim() }).select().single()
    if (data) setMessages(m => [...m, data])
    setNewMsg(''); setSaving(false)
  }

  async function updateStatus(status: string) {
    setEditStatus(status)
    const supabase = createClient()
    await supabase.from('clients').update({ status }).eq('id', id as string)
    setClient((c: any) => ({ ...c, status }))
  }

  async function updateProgress(step: number) {
    setProgressStep(step)
    const supabase = createClient()
    await supabase.from('clients').update({ progress_step: step }).eq('id', id as string)
    setClient((c: any) => ({ ...c, progress_step: step }))
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
  const TABS = ['tasks', 'action items', 'requests', 'messages', 'billing']

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>
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

      <div style={{ background:'#fff', borderBottom:'1px solid #E8EAF0', padding:'10px 32px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' as const }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#94A3B8', marginRight:4 }}>Status:</span>
          {['active','review','pending'].map(s => (
            <button key={s} onClick={() => updateStatus(s)}
              style={{ padding:'5px 14px', borderRadius:999, border:`1.5px solid ${editStatus===s?'#6C63FF':'#E8EAF0'}`, background:editStatus===s?'#EEF0FF':'#fff', color:editStatus===s?'#6C63FF':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {s==='active'?'Active':s==='review'?'In Review':'Pending'}
            </button>
          ))}
        </div>
        <div style={{ width:1, height:20, background:'#E8EAF0' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#94A3B8', marginRight:4 }}>Progress:</span>
          {['Submitted','In Progress','Your Review','Completed'].map((label, i) => (
            <button key={i} onClick={() => updateProgress(i)}
              style={{ padding:'5px 12px', borderRadius:999, border:`1.5px solid ${progressStep===i?'#6C63FF':progressStep>i?'#10B981':'#E8EAF0'}`, background:progressStep===i?'#EEF0FF':progressStep>i?'#ECFDF5':'#fff', color:progressStep===i?'#6C63FF':progressStep>i?'#10B981':'#64748B', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const }}>
              {progressStep>i?'✓ ':''}{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', borderBottom:'1px solid #E8EAF0', padding:'0 32px', display:'flex', overflowX:'auto' as const }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 16px', border:'none', borderBottom:`2px solid ${tab===t?'#6C63FF':'transparent'}`, background:'transparent', fontSize:13, fontWeight:tab===t?600:400, color:tab===t?'#6C63FF':'#94A3B8', cursor:'pointer', whiteSpace:'nowrap' as const, textTransform:'capitalize' as const }}>
            {t}{t==='action items'?` (${clientTasks.length})`:''}
          </button>
        ))}
      </div>

      <div style={{ padding:'24px 32px', maxWidth:800 }}>

        {/* ADMIN TASKS */}
        {tab === 'tasks' && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Your tasks ({tasks.filter(t=>!t.done).length} open)</div>
            {tasks.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', padding:'16px 0' }}>No tasks yet.</div>}
            {tasks.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #E8EAF0' }}>
                <div onClick={() => toggleTask(t)} style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${t.done?'#6C63FF':'#E8EAF0'}`, background:t.done?'#6C63FF':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {t.done && <svg viewBox="0 0 24 24" style={{ width:10, height:10 }} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex:1, fontSize:13, color:t.done?'#94A3B8':'#0D0D1A', textDecoration:t.done?'line-through':'none' }}>{t.title}</div>
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

        {/* CLIENT ACTION ITEMS */}
        {tab === 'action items' && (
          <div>
            <div style={{ background:'#EEF0FF', border:'1px solid rgba(108,99,255,.15)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#6C63FF' }}>
              💡 These are tasks <strong>assigned to the client</strong> — things they need to do like sending logos, approving copy, or uploading files. They see and complete these in their portal.
            </div>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:10, marginBottom:16 }}>
              {clientTasks.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', padding:'24px', textAlign:'center', background:'#fff', border:'1px solid #E8EAF0', borderRadius:12 }}>No action items assigned yet. Add one below.</div>}
              {clientTasks.map(ct => (
                <div key={ct.id} style={{ background:'#fff', border:`1px solid ${ct.done?'#ECFDF5':'#E8EAF0'}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{ct.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A', marginBottom:4 }}>{ct.title}</div>
                    {ct.description && <div style={{ fontSize:12, color:'#64748B', marginBottom:6 }}>{ct.description}</div>}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#EEF0FF', color:'#6C63FF' }}>{ct.type}</span>
                      {ct.done
                        ? <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#ECFDF5', color:'#10B981' }}>✓ Completed</span>
                        : <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:999, background:'#FFFBEB', color:'#F59E0B' }}>Pending</span>}
                      {ct.response && <span style={{ fontSize:11, color:'#64748B' }}>Response: {ct.response}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteClientTask(ct.id)} style={{ background:'none', border:'none', color:'#94A3B8', cursor:'pointer', fontSize:16, flexShrink:0 }} title="Delete">✕</button>
                </div>
              ))}
            </div>
            {!showCtForm ? (
              <button onClick={() => setShowCtForm(true)} style={{ padding:'10px 20px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                + Assign action item to client
              </button>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:12, padding:20, display:'flex', flexDirection:'column' as const, gap:14 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>New action item for client</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
                  {TASK_EMOJIS.map(e => (
                    <button key={e} onClick={() => setCtForm(f => ({...f, emoji:e}))}
                      style={{ width:36, height:36, borderRadius:8, border:`2px solid ${ctForm.emoji===e?'#6C63FF':'#E8EAF0'}`, background:ctForm.emoji===e?'#EEF0FF':'#fff', fontSize:18, cursor:'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
                <input value={ctForm.title} onChange={e => setCtForm(f => ({...f, title:e.target.value}))} placeholder="Task title e.g. Send your logo files"
                  style={{ fontSize:13, padding:'8px 12px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none' }}/>
                <textarea value={ctForm.description} onChange={e => setCtForm(f => ({...f, description:e.target.value}))} placeholder="Instructions for the client…" rows={3}
                  style={{ fontSize:13, padding:'8px 12px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', resize:'vertical' as const }}/>
                <div style={{ display:'flex', gap:8 }}>
                  {TASK_TYPES.map(t => (
                    <button key={t} onClick={() => setCtForm(f => ({...f, type:t}))}
                      style={{ padding:'6px 14px', borderRadius:999, border:`1.5px solid ${ctForm.type===t?'#6C63FF':'#E8EAF0'}`, background:ctForm.type===t?'#EEF0FF':'#fff', color:ctForm.type===t?'#6C63FF':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {t==='file'?'📎 File upload':t==='text'?'📝 Text response':'🔍 Review & approve'}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setShowCtForm(false)} style={{ flex:1, padding:'10px', background:'#F5F6FA', color:'#64748B', border:'1px solid #E8EAF0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                  <button onClick={addClientTask} disabled={saving || !ctForm.title.trim()} style={{ flex:2, padding:'10px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    {saving ? 'Saving…' : 'Assign to client →'}
                  </button>
                </div>
              </div>
            )}
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
                <div key={r.id} style={{ padding:14, background:'#F5F6FA', borderRadius:10, marginBottom:10, border:'1px solid #E8EAF0' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>{r.title}</div>
                      {r.description && <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>{r.description}</div>}
                      {r.link && <a href={r.link} target="_blank" style={{ fontSize:11, color:'#6C63FF', marginTop:4, display:'block' }}>{r.link}</a>}
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:999, background:rp.bg, color:rp.color, flexShrink:0 }}>{r.status}</span>
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button onClick={() => acceptRequest(r)} style={{ padding:'5px 14px', background:'#ECFDF5', color:'#10B981', border:'1px solid rgba(16,185,129,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✓ Accept & add to tasks</button>
                      <button onClick={async () => { const s = createClient(); await s.from('requests').update({status:'declined'}).eq('id',r.id); setRequests(x => x.map(q => q.id===r.id?{...q,status:'declined'}:q)) }}
                        style={{ padding:'5px 14px', background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✕ Decline</button>
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
            <div style={{ marginBottom:16, fontWeight:600, fontSize:14 }}>Messages with {client.name}</div>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:10, marginBottom:16, maxHeight:400, overflowY:'auto' as const }}>
              {messages.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:32 }}>No messages yet. Send the first one.</div>}
              {messages.map(m => (
                <div key={m.id} style={{ padding:'10px 14px', background:m.from_admin?'#EEF0FF':'#F5F6FA', borderRadius:10, maxWidth:'80%', alignSelf:m.from_admin?'flex-end':'flex-start' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:m.from_admin?'#6C63FF':'#64748B', marginBottom:4 }}>{m.from_admin?'You':client.name}</div>
                  <div style={{ fontSize:13, color:'#0D0D1A' }}>{m.text}</div>
                  <div style={{ fontSize:10, color:'#94A3B8', marginTop:4 }}>{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="Write a message to client…"
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
