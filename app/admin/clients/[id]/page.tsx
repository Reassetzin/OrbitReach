'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'
import { useParams } from 'next/navigation'

const STATUS_META: Record<string, {bg:string,color:string,label:string}> = {
  active:  { bg:'#ECFDF5', color:'#10B981', label:'Active'    },
  review:  { bg:'#FFFBEB', color:'#F59E0B', label:'In Review' },
  pending: { bg:'#F5F6FA', color:'#64748B', label:'Pending'   },
}
const STEPS = ['Submitted','In Progress','Your Review','Completed']
const TASK_EMOJIS = ['📋','📎','📝','🔍','🖼️','✅','💬','🔗']
const TASK_TYPES  = ['file','text','review'] as const

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient]             = useState<any>(null)
  const [tasks, setTasks]               = useState<any[]>([])
  const [clientTasks, setClientTasks]   = useState<any[]>([])
  const [messages, setMessages]         = useState<any[]>([])
  const [requests, setRequests]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [editStatus, setEditStatus]     = useState('pending')
  const [progressStep, setProgressStep] = useState(1)
  // task inputs
  const [newTask, setNewTask]           = useState('')
  const [savingTask, setSavingTask]     = useState(false)
  // client task form
  const [showCtForm, setShowCtForm]     = useState(false)
  const [ctForm, setCtForm]             = useState({ emoji:'📋', title:'', description:'', type:'text' as typeof TASK_TYPES[number] })
  const [savingCt, setSavingCt]         = useState(false)
  // messaging
  const [newMsg, setNewMsg]             = useState('')
  const [sending, setSending]           = useState(false)
  // request history panel
  const [showHistory, setShowHistory]   = useState(false)
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
      setClient(c.data); setEditStatus(c.data?.status ?? 'pending'); setProgressStep(c.data?.progress_step ?? 1)
      setTasks(t.data ?? []); setClientTasks(ct.data ?? [])
      setMessages(m.data ?? []); setRequests(r.data ?? [])
      setLoading(false)
      // subscribe AFTER initial data is set so new messages append correctly
      channel = supabase.channel('admin-msgs-'+id)
        .on('postgres_changes',
          { event:'INSERT', schema:'public', table:'messages', filter:`client_id=eq.${id}` },
          payload => setMessages(ms => [...ms, payload.new as any])
        )
        .subscribe()
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

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

  async function addTask() {
    if (!newTask.trim()) return
    setSavingTask(true)
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert({ client_id: id, title: newTask.trim(), done: false, status: 'backlog' }).select().single()
    if (data) setTasks(t => [...t, data])
    setNewTask(''); setSavingTask(false)
  }

  async function toggleTask(task: any) {
    const supabase = createClient()
    const done = !task.done
    await supabase.from('tasks').update({ done, status: done ? 'done' : 'backlog' }).eq('id', task.id)
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done, status: done ? 'done' : 'backlog' } : x))
  }

  async function addClientTask() {
    if (!ctForm.title.trim()) return
    setSavingCt(true)
    const supabase = createClient()
    const { data } = await supabase.from('client_tasks').insert({
      client_id: id, emoji: ctForm.emoji, title: ctForm.title.trim(),
      description: ctForm.description.trim(), type: ctForm.type, done: false
    }).select().single()
    if (data) setClientTasks(t => [...t, data])
    setCtForm({ emoji:'📋', title:'', description:'', type:'text' })
    setShowCtForm(false); setSavingCt(false)
  }

  async function deleteClientTask(ctId: string) {
    const supabase = createClient()
    await supabase.from('client_tasks').delete().eq('id', ctId)
    setClientTasks(t => t.filter(x => x.id !== ctId))
  }

  async function sendMessage() {
    if (!newMsg.trim()) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({ client_id: id, from_admin: true, text: newMsg.trim() })
    setNewMsg(''); setSending(false)
  }

  async function acceptRequest(req: any) {
    const supabase = createClient()
    await supabase.from('requests').update({ status: 'accepted' }).eq('id', req.id)
    const alreadyExists = tasks.some(t => t.title === req.title)
    if (!alreadyExists) {
      const { data } = await supabase.from('tasks').insert({ client_id: id, title: req.title, done: false, status: 'in_progress' }).select().single()
      if (data) setTasks(t => [...t, data])
    }
    setRequests(r => r.map(x => x.id === req.id ? { ...x, status: 'accepted' } : x))
  }

  async function declineRequest(req: any) {
    const supabase = createClient()
    await supabase.from('requests').update({ status: 'declined' }).eq('id', req.id)
    setRequests(r => r.map(x => x.id === req.id ? { ...x, status: 'declined' } : x))
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#94A3B8', fontFamily:'Inter,sans-serif' }}>Loading…</div>
  if (!client) return <div style={{ padding:48, textAlign:'center', color:'#EF4444', fontFamily:'Inter,sans-serif' }}>Client not found.</div>

  const p = STATUS_META[client.status] ?? STATUS_META.pending
  const pendingReqs = requests.filter(r => r.status === 'pending')
  const REQ_STATUS: Record<string,{bg:string,color:string,label:string}> = {
    pending:  {bg:'#FFFBEB',color:'#F59E0B',label:'Pending'},
    accepted: {bg:'#ECFDF5',color:'#10B981',label:'Accepted'},
    backlog:  {bg:'#EEF0FF',color:'#6C63FF',label:'Backlog'},
    declined: {bg:'#FEF2F2',color:'#EF4444',label:'Declined'},
  }

  return (
    <div style={{ fontFamily:'Inter,sans-serif', position:'relative' }}>

      {/* Request history slide-in panel */}
      {showHistory && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }} onClick={e => e.target === e.currentTarget && setShowHistory(false)}>
          <div style={{ marginLeft:'auto', width:420, background:'#fff', height:'100%', boxShadow:'-8px 0 32px rgba(0,0,0,.12)', display:'flex', flexDirection:'column' as const }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #E8EAF0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#0D0D1A' }}>Request history</div>
                <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{client.name} · {requests.length} total</div>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background:'#F5F6FA', border:'1px solid #E8EAF0', borderRadius:8, padding:'6px 12px', fontSize:13, color:'#64748B', cursor:'pointer' }}>✕ Close</button>
            </div>
            <div style={{ flex:1, overflowY:'auto' as const, padding:'16px 24px' }}>
              {requests.length === 0 && <div style={{ textAlign:'center', padding:32, color:'#94A3B8', fontSize:13 }}>No requests yet.</div>}
              {requests.map(r => {
                const s = REQ_STATUS[r.status] ?? REQ_STATUS.pending
                return (
                  <div key={r.id} style={{ padding:'14px', background:'#F5F6FA', borderRadius:12, marginBottom:12, border:'1px solid #E8EAF0' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A', marginBottom:4 }}>{r.title}</div>
                        {r.description && <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>{r.description}</div>}
                        {r.link && <a href={r.link} target="_blank" style={{ fontSize:11, color:'#6C63FF', display:'block', marginBottom:4 }}>{r.link}</a>}
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{new Date(r.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:999, background:s.bg, color:s.color, flexShrink:0 }}>{s.label}</span>
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button onClick={() => acceptRequest(r)} style={{ padding:'5px 14px', background:'#ECFDF5', color:'#10B981', border:'1px solid rgba(16,185,129,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✓ Accept</button>
                        <button onClick={() => declineRequest(r)} style={{ padding:'5px 14px', background:'#FEF2F2', color:'#EF4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}>✕ Decline</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8', marginBottom:4 }}>
          <a href="/admin/clients" style={{ color:'#6C63FF', textDecoration:'none' }}>← Clients</a>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>{client.name}</div>
            <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{client.type} · ${client.monthly_retainer}/mo · {client.email}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {pendingReqs.length > 0 && (
              <button onClick={() => setShowHistory(true)} style={{ padding:'7px 14px', background:'#FFFBEB', color:'#F59E0B', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                ⚡ {pendingReqs.length} pending request{pendingReqs.length>1?'s':''}
              </button>
            )}
            <button onClick={() => setShowHistory(true)} style={{ padding:'7px 14px', background:'#F5F6FA', color:'#64748B', border:'1px solid #E8EAF0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              📋 Request history ({requests.length})
            </button>
            <span style={{ fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:999, background:p.bg, color:p.color }}>{p.label}</span>
          </div>
        </div>
      </div>

      {/* Status + Progress bar */}
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
          {STEPS.map((label, i) => (
            <button key={i} onClick={() => updateProgress(i)}
              style={{ padding:'5px 12px', borderRadius:999, border:`1.5px solid ${progressStep===i?'#6C63FF':progressStep>i?'#10B981':'#E8EAF0'}`, background:progressStep===i?'#EEF0FF':progressStep>i?'#ECFDF5':'#fff', color:progressStep===i?'#6C63FF':progressStep>i?'#10B981':'#64748B', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const }}>
              {progressStep>i?'✓ ':''}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3-column grid */}
      <style>{`
        .client-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; padding:24px 32px; }
        @media(max-width:768px) { .client-grid { grid-template-columns:1fr; padding:12px; gap:14px; } }
        .billing-wrap { margin:0 32px 32px; }
        @media(max-width:768px) { .billing-wrap { margin:0 12px 20px; } }
        .rev-controls { margin-left:auto; }
        @media(max-width:768px) { .rev-controls { margin-left:0; width:100%; } }
        .stat-prog { padding:10px 32px; }
        @media(max-width:768px) { .stat-prog { padding:10px 12px; overflow-x:auto; } }
      `}</style>
      <div className="client-grid">

        {/* YOUR TASKS (admin) */}
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#0D0D1A', marginBottom:4 }}>Your tasks</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginBottom:14 }}>Internal — not visible to client.</div>
          {tasks.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', padding:'12px 0', textAlign:'center' }}>No tasks yet.</div>}
          {tasks.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #F5F6FA' }}>
              <div onClick={() => toggleTask(t)} style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${t.done?'#6C63FF':'#E8EAF0'}`, background:t.done?'#6C63FF':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {t.done && <svg viewBox="0 0 24 24" style={{ width:10, height:10 }} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{ flex:1, fontSize:13, color:t.done?'#94A3B8':'#0D0D1A', textDecoration:t.done?'line-through':'none', lineHeight:1.4 }}>{t.title}</div>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999, background:'#EEF0FF', color:'#6C63FF', flexShrink:0 }}>{t.status}</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key==='Enter' && addTask()} placeholder="Add a task…"
              style={{ flex:1, fontSize:13, padding:'8px 10px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none' }}/>
            <button onClick={addTask} disabled={savingTask} style={{ padding:'8px 14px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>Add</button>
          </div>
        </div>

        {/* CLIENT ACTION ITEMS */}
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#0D0D1A', marginBottom:4 }}>Client action items</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginBottom:14 }}>Tasks you assign — client sees and completes these.</div>
          {clientTasks.length === 0 && <div style={{ fontSize:13, color:'#94A3B8', padding:'12px 0', textAlign:'center' }}>None assigned yet.</div>}
          {clientTasks.map(ct => (
            <div key={ct.id} style={{ padding:'10px 12px', background:ct.done?'#F5F6FA':'#fff', border:`1px solid ${ct.done?'#E8EAF0':'#E8EAF0'}`, borderRadius:10, marginBottom:8, display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:2 }}>{ct.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:ct.done?'#94A3B8':'#0D0D1A', textDecoration:ct.done?'line-through':'none' }}>{ct.title}</div>
                {ct.description && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{ct.description}</div>}
                <div style={{ display:'flex', gap:6, marginTop:4, alignItems:'center' }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999, background:'#EEF0FF', color:'#6C63FF' }}>{ct.type}</span>
                  {ct.done ? <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999, background:'#ECFDF5', color:'#10B981' }}>✓ Done</span> : <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999, background:'#FFFBEB', color:'#F59E0B' }}>Pending</span>}
                  {ct.response && <span style={{ fontSize:11, color:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>"{ct.response.substring(0,30)}"</span>}
                </div>
              </div>
              <button onClick={() => deleteClientTask(ct.id)} style={{ background:'none', border:'none', color:'#E8EAF0', cursor:'pointer', fontSize:14, flexShrink:0, padding:'2px' }} onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')} onMouseLeave={e=>(e.currentTarget.style.color='#E8EAF0')}>✕</button>
            </div>
          ))}
          {!showCtForm ? (
            <button onClick={() => setShowCtForm(true)} style={{ width:'100%', padding:'9px', background:'#F5F6FA', color:'#6C63FF', border:'1.5px dashed #E8EAF0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              + Assign action item
            </button>
          ) : (
            <div style={{ background:'#F5F6FA', borderRadius:10, padding:14, marginTop:8, display:'flex', flexDirection:'column' as const, gap:10 }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' as const }}>
                {TASK_EMOJIS.map(e => (
                  <button key={e} onClick={() => setCtForm(f => ({...f, emoji:e}))}
                    style={{ width:32, height:32, borderRadius:7, border:`2px solid ${ctForm.emoji===e?'#6C63FF':'#E8EAF0'}`, background:ctForm.emoji===e?'#EEF0FF':'#fff', fontSize:16, cursor:'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
              <input value={ctForm.title} onChange={e => setCtForm(f => ({...f, title:e.target.value}))} placeholder="Task title…"
                style={{ fontSize:13, padding:'8px 10px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#fff', outline:'none' }}/>
              <textarea value={ctForm.description} onChange={e => setCtForm(f => ({...f, description:e.target.value}))} placeholder="Instructions for client…" rows={2}
                style={{ fontSize:13, padding:'8px 10px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#fff', outline:'none', resize:'vertical' as const }}/>
              <div style={{ display:'flex', gap:6 }}>
                {TASK_TYPES.map(t => (
                  <button key={t} onClick={() => setCtForm(f => ({...f, type:t}))}
                    style={{ flex:1, padding:'5px', borderRadius:8, border:`1.5px solid ${ctForm.type===t?'#6C63FF':'#E8EAF0'}`, background:ctForm.type===t?'#EEF0FF':'#fff', color:ctForm.type===t?'#6C63FF':'#64748B', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    {t==='file'?'📎 File':t==='text'?'📝 Text':'🔍 Review'}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowCtForm(false)} style={{ flex:1, padding:'8px', background:'#fff', color:'#64748B', border:'1px solid #E8EAF0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                <button onClick={addClientTask} disabled={savingCt||!ctForm.title.trim()} style={{ flex:2, padding:'8px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {savingCt?'Saving…':'Assign →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LIVE MESSAGES */}
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, display:'flex', flexDirection:'column' as const, overflow:'hidden' }}>
          <div style={{ padding:'16px 18px', borderBottom:'1px solid #E8EAF0', fontSize:14, fontWeight:600, color:'#0D0D1A', flexShrink:0 }}>
            Messages with {client.name}
          </div>
          <div style={{ flex:1, overflowY:'auto' as const, padding:'12px 14px', display:'flex', flexDirection:'column' as const, gap:8, minHeight:240, maxHeight:420 }}>
            {messages.length === 0 && <div style={{ textAlign:'center', padding:24, color:'#94A3B8', fontSize:13 }}>No messages yet. Send the first one.</div>}
            {messages.map(m => (
              <div key={m.id} style={{ display:'flex', justifyContent:m.from_admin?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius:m.from_admin?'12px 4px 12px 12px':'4px 12px 12px 12px', background:m.from_admin?'linear-gradient(135deg,#6C63FF,#A855F7)':'#F5F6FA', border:m.from_admin?'none':'1px solid #E8EAF0' }}>
                  <div style={{ fontSize:10, fontWeight:600, marginBottom:3, color:m.from_admin?'rgba(255,255,255,.75)':'#6C63FF' }}>{m.from_admin?'You':client.name}</div>
                  <div style={{ fontSize:13, color:m.from_admin?'#fff':'#0D0D1A', lineHeight:1.5 }}>{m.text}</div>
                  <div style={{ fontSize:10, marginTop:3, color:m.from_admin?'rgba(255,255,255,.6)':'#94A3B8' }}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:'10px 12px', borderTop:'1px solid #E8EAF0', display:'flex', gap:8, flexShrink:0 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()} placeholder="Write a message…"
              style={{ flex:1, fontSize:13, padding:'9px 12px', border:'1.5px solid #E8EAF0', borderRadius:9, background:'#F5F6FA', outline:'none' }}/>
            <button onClick={sendMessage} disabled={sending||!newMsg.trim()} style={{ padding:'9px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', opacity:(!newMsg.trim()||sending)?0.5:1 }}>
              {sending?'…':'Send'}
            </button>
          </div>
        </div>

      </div>

      {/* Billing strip */}
      <div style={{ margin:'0 32px 32px', background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:'16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:32, flexWrap:'wrap' as const }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>Billing</div>
          {[
            ['Contact', client.contact??'—'],
            ['Setup fee', client.setup_fee>0?`$${client.setup_fee} (one-time)`:'—'],
            ['Retainer', `$${client.monthly_retainer}/mo`],
            ['Next payment', client.next_payment??'Not set'],
            ['Status', p.label],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontSize:11, color:'#94A3B8', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:l==='Status'?p.color:'#0D0D1A' }}>{v as string}</div>
            </div>
          ))}
          {/* Revision manager inline */}
          <div style={{ marginLeft:'auto', background:'#F5F6FA', borderRadius:12, padding:'10px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#94A3B8', marginBottom:2 }}>Revisions</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0D0D1A' }}>{client.revisions_used??0} / {client.monthly_revisions??5} used</div>
            </div>
            <div style={{ width:1, height:28, background:'#E8EAF0' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, color:'#64748B', fontWeight:500 }}>Adjust:</span>
              <button onClick={async()=>{
                const used = Math.max(0,(client.revisions_used??0)-1)
                const supabase=createClient()
                await supabase.from('clients').update({revisions_used:used}).eq('id',id as string)
                setClient((c:any)=>({...c,revisions_used:used}))
              }} style={{ width:28,height:28,borderRadius:7,border:'1px solid #E8EAF0',background:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B' }}>−</button>
              <button onClick={async()=>{
                const used = (client.revisions_used??0)+1
                const supabase=createClient()
                await supabase.from('clients').update({revisions_used:used}).eq('id',id as string)
                setClient((c:any)=>({...c,revisions_used:used}))
              }} style={{ width:28,height:28,borderRadius:7,border:'1px solid #E8EAF0',background:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B' }}>+</button>
            </div>
            <div style={{ width:1, height:28, background:'#E8EAF0' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, color:'#64748B', fontWeight:500 }}>Monthly:</span>
              <button onClick={async()=>{
                const total = Math.max(1,(client.monthly_revisions??5)-1)
                const supabase=createClient()
                await supabase.from('clients').update({monthly_revisions:total}).eq('id',id as string)
                setClient((c:any)=>({...c,monthly_revisions:total}))
              }} style={{ width:28,height:28,borderRadius:7,border:'1px solid #E8EAF0',background:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B' }}>−</button>
              <span style={{ fontSize:13, fontWeight:700, color:'#6C63FF', minWidth:20, textAlign:'center' }}>{client.monthly_revisions??5}</span>
              <button onClick={async()=>{
                const total = (client.monthly_revisions??5)+1
                const supabase=createClient()
                await supabase.from('clients').update({monthly_revisions:total}).eq('id',id as string)
                setClient((c:any)=>({...c,monthly_revisions:total}))
              }} style={{ width:28,height:28,borderRadius:7,border:'1px solid #E8EAF0',background:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B' }}>+</button>
            </div>
            <button onClick={async()=>{
              const supabase=createClient()
              await supabase.from('clients').update({revisions_used:0}).eq('id',id as string)
              setClient((c:any)=>({...c,revisions_used:0}))
            }} style={{ padding:'5px 12px',background:'#ECFDF5',color:'#10B981',border:'1px solid rgba(16,185,129,.2)',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' as const }}>
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

    </div>
  )}
