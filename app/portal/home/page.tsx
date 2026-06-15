'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'

const STEPS = [
  { label:'Submitted',   icon:'📥', sub:'Request received'  },
  { label:'In Progress', icon:'⚙️', sub:"We're building it" },
  { label:'Your Review', icon:'👀', sub:'Action needed'     },
  { label:'Completed',   icon:'✅', sub:'Live on your site' },
]

export default function PortalHomePage() {
  const [client, setClient]           = useState<any>(null)
  const [clientTasks, setClientTasks] = useState<any[]>([])
  const [messages, setMessages]       = useState<any[]>([])
  const [requests, setRequests]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  // task modal
  const [modal, setModal]     = useState<any>(null)
  const [taskResp, setTaskResp] = useState('')
  const [taskFile, setTaskFile] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  // messaging
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  // request form
  const [reqTitle, setReqTitle]   = useState('')
  const [reqDesc, setReqDesc]     = useState('')
  const [reqLink, setReqLink]     = useState('')
  const [reqFile, setReqFile]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reqSuccess, setReqSuccess] = useState(false)
  const [reqError, setReqError]   = useState('')
  const [showReqHistory, setShowReqHistory] = useState(false)
  // refs
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
        channel = supabase.channel('portal-msgs-'+c.id)
          .on('postgres_changes',
            { event:'INSERT', schema:'public', table:'messages', filter:`client_id=eq.${c.id}` },
            payload => setMessages(ms => [...ms, payload.new as any])
          )
          .subscribe()
      })
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function completeTask() {
    if (!modal) return
    setSavingTask(true)
    const supabase = createClient()
    const resp = taskFile ? `File: ${taskFile}${taskResp ? ' — ' + taskResp : ''}` : taskResp || 'Submitted'
    await supabase.from('client_tasks').update({ done: true, response: resp }).eq('id', modal.id)
    setClientTasks(t => t.map(x => x.id === modal.id ? { ...x, done: true, response: resp } : x))
    setModal(null); setTaskResp(''); setTaskFile(''); setSavingTask(false)
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
    const left = (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0)
    setSubmitting(true); setReqError('')
    const supabase = createClient()
    const status = left <= 0 ? 'backlog' : 'pending'
    const titleWithFile = reqFile ? `${reqTitle.trim()} [attachment: ${reqFile}]` : reqTitle.trim()
    const { data } = await supabase.from('requests').insert({
      client_id: client.id, title: titleWithFile,
      description: reqDesc.trim() || null, link: reqLink.trim() || null, status
    }).select().single()
    if (data) {
      setRequests(r => [data, ...r])
      if (left > 0) {
        await supabase.from('clients').update({ revisions_used: (client.revisions_used ?? 0) + 1 }).eq('id', client.id)
        setClient((c: any) => ({ ...c, revisions_used: (c.revisions_used ?? 0) + 1 }))
      }
    }
    setReqTitle(''); setReqDesc(''); setReqLink(''); setReqFile('')
    setSubmitting(false); setReqSuccess(true)
    setTimeout(() => setReqSuccess(false), 3000)
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading your portal…</div>
  if (!client) return <div style={{padding:48,textAlign:'center',fontFamily:'Inter,sans-serif'}}><div style={{fontSize:32,marginBottom:16}}>⏳</div><div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Your portal is being set up</div><div style={{fontSize:13,color:'#94A3B8'}}>Your studio will have it ready shortly.</div></div>

  const tasksDone = clientTasks.filter(t => t.done).length
  const left = Math.max(0, (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0))
  const pct  = Math.round(((client.revisions_used ?? 0) / (client.monthly_revisions ?? 5)) * 100)
  const step = client.progress_step ?? 1
  const pending   = clientTasks.filter(t => !t.done)
  const completed = clientTasks.filter(t => t.done)
  const STATUS_REQ: Record<string,{bg:string,color:string,label:string}> = {
    pending:  {bg:'#FFFBEB',color:'#F59E0B',label:'Pending'},
    accepted: {bg:'#ECFDF5',color:'#10B981',label:'Accepted'},
    backlog:  {bg:'#EEF0FF',color:'#6C63FF',label:'Next month'},
    declined: {bg:'#FEF2F2',color:'#EF4444',label:'Declined'},
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 60px',maxWidth:1100,margin:'0 auto'}}>

      {/* Request history panel */}
      {showReqHistory&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex'}} onClick={e=>e.target===e.currentTarget&&setShowReqHistory(false)}>
          <div style={{marginLeft:'auto',width:420,background:'#fff',height:'100%',boxShadow:'-8px 0 32px rgba(0,0,0,.12)',display:'flex',flexDirection:'column' as const}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #E8EAF0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#0D0D1A'}}>Request history</div>
                <div style={{fontSize:12,color:'#94A3B8',marginTop:2}}>{requests.length} total · {requests.filter(r=>r.status==='pending').length} pending</div>
              </div>
              <button onClick={()=>setShowReqHistory(false)} style={{background:'#F5F6FA',border:'1px solid #E8EAF0',borderRadius:8,padding:'6px 14px',fontSize:13,color:'#64748B',cursor:'pointer',fontWeight:600}}>✕ Close</button>
            </div>
            <div style={{flex:1,overflowY:'auto' as const,padding:'16px 24px'}}>
              {requests.length===0&&<div style={{textAlign:'center',padding:32,color:'#94A3B8',fontSize:13}}>No requests yet.</div>}
              {requests.map(r=>{
                const s=STATUS_REQ[r.status]??STATUS_REQ.pending
                return (
                  <div key={r.id} style={{padding:14,background:'#F5F6FA',borderRadius:12,marginBottom:12,border:'1px solid #E8EAF0'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#0D0D1A',flex:1}}>{r.title}</div>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,background:s.bg,color:s.color,flexShrink:0}}>{s.label}</span>
                    </div>
                    {r.description&&<div style={{fontSize:12,color:'#64748B',marginBottom:6,lineHeight:1.5}}>{r.description}</div>}
                    {r.link&&<a href={r.link} target="_blank" style={{fontSize:11,color:'#6C63FF',display:'block',marginBottom:6}}>{r.link}</a>}
                    <div style={{fontSize:11,color:'#94A3B8'}}>{new Date(r.created_at).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}
          onClick={e=>e.target===e.currentTarget&&(setModal(null),setTaskResp(''),setTaskFile(''))}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:22,marginBottom:8}}>{modal.emoji}</div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:6,color:'#0D0D1A'}}>{modal.title}</div>
            <div style={{fontSize:13,color:'#64748B',marginBottom:20,lineHeight:1.6}}>{modal.description}</div>
            <div onClick={()=>taskFileRef.current?.click()} style={{border:'1.5px dashed #E8EAF0',borderRadius:10,padding:18,textAlign:'center',marginBottom:12,cursor:'pointer',background:'#F5F6FA',transition:'border-color .14s'}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='#6C63FF')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E8EAF0')}>
              <div style={{fontSize:20,marginBottom:4}}>📎</div>
              <div style={{fontSize:13,color:taskFile?'#6C63FF':'#64748B',fontWeight:taskFile?600:400}}>{taskFile?'✓ '+taskFile:'Attach a file (optional)'}</div>
              <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>PNG, PDF, SVG, ZIP, DOCX</div>
            </div>
            <input ref={taskFileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)setTaskFile(f.name)}}/>
            <textarea value={taskResp} onChange={e=>setTaskResp(e.target.value)} rows={3}
              placeholder={modal.type==='file'?'Add a note…':modal.type==='review'?'Approved! / Please change…':'Your response…'}
              style={{width:'100%',fontSize:13,padding:'10px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>{setModal(null);setTaskResp('');setTaskFile('')}} style={{flex:1,padding:'10px',background:'#F5F6FA',color:'#64748B',border:'1px solid #E8EAF0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={completeTask} disabled={savingTask} style={{flex:2,padding:'10px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {savingTask?'Submitting…':'Submit & mark done →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <div style={{background:'linear-gradient(135deg,#6C63FF 0%,#A855F7 100%)',borderRadius:20,padding:'28px 32px',color:'#fff',marginBottom:24,position:'relative',overflow:'hidden',boxShadow:'0 8px 24px rgba(108,99,255,.25)'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase' as const,opacity:.7,marginBottom:6}}>{client.type}</div>
        <div style={{fontSize:26,fontWeight:700,letterSpacing:'-.02em',marginBottom:4,position:'relative'}}>{client.name}</div>
        <div style={{fontSize:13,opacity:.75,marginBottom:20}}>Active plan · ${client.monthly_retainer}/month</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap' as const}}>
          {[{val:`${tasksDone}/${clientTasks.length}`,lbl:'Tasks done'},{val:`${left} left`,lbl:'Requests this month'},{val:client.next_payment??'TBD',lbl:'Next payment'}].map(s=>(
            <div key={s.lbl} style={{background:'rgba(255,255,255,.15)',borderRadius:12,padding:'10px 18px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:18,fontWeight:700}}>{s.val}</div>
              <div style={{fontSize:11,opacity:.7,marginTop:2}}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 28px',marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:18,color:'#0D0D1A'}}>Website progress</div>
        <div style={{display:'flex',alignItems:'flex-start'}}>
          {STEPS.map((s,i)=>{
            const isDone=i<step; const isActive=i===step
            return (
              <div key={s.label} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',position:'relative'}}>
                {i<STEPS.length-1&&<div style={{position:'absolute',top:13,left:'50%',right:'-50%',height:2,background:isDone?'#10B981':'#E8EAF0',zIndex:0,transition:'background .4s'}}/>}
                <div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${isDone?'#10B981':isActive?'#6C63FF':'#E8EAF0'}`,background:isDone?'#10B981':isActive?'#6C63FF':'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,position:'relative',zIndex:1,marginBottom:8,boxShadow:isActive?'0 0 0 4px rgba(108,99,255,.15)':'none'}}>
                  {isDone?<svg viewBox="0 0 24 24" style={{width:12,height:12}} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:<span style={{color:isActive?'#fff':'#94A3B8',fontSize:12}}>{s.icon}</span>}
                </div>
                <div style={{fontSize:11,fontWeight:600,textAlign:'center',color:isDone?'#10B981':isActive?'#6C63FF':'#94A3B8'}}>{s.label}</div>
                <div style={{fontSize:10,color:'#94A3B8',textAlign:'center',marginTop:2}}>{s.sub}</div>
                {isActive&&s.label==='Your Review'&&<div style={{fontSize:10,fontWeight:600,color:'#F59E0B',marginTop:4,textAlign:'center'}}>⚠ Needs your input</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── THREE COLUMN GRID ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:24}}>

        {/* Action items */}
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px',display:'flex',flexDirection:'column' as const}}>
          <div style={{fontSize:14,fontWeight:600,color:'#0D0D1A',marginBottom:4}}>Action items</div>
          <div style={{fontSize:12,color:'#94A3B8',marginBottom:16}}>Tap a task to respond or attach files.</div>
          {pending.length===0&&completed.length===0&&<div style={{textAlign:'center',padding:'20px 0',color:'#94A3B8',fontSize:13,flex:1}}>No items yet 🎉</div>}
          {pending.map(t=>(
            <div key={t.id} onClick={()=>{setModal(t);setTaskResp('');setTaskFile('')}}
              style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:12,border:'1px solid #E8EAF0',marginBottom:8,cursor:'pointer'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#6C63FF';e.currentTarget.style.background='#FAFAFF'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#E8EAF0';e.currentTarget.style.background='#fff'}}>
              <div style={{width:36,height:36,borderRadius:9,background:'#EEF0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{t.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0D0D1A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{t.title}</div>
                <div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>{t.type==='file'?'📎 File upload':t.type==='review'?'🔍 Review':'📝 Response'}</div>
              </div>
              <svg style={{width:13,height:13,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
          {completed.length>0&&(
            <div style={{marginTop:8,paddingTop:12,borderTop:'1px solid #E8EAF0'}}>
              <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#94A3B8',marginBottom:8}}>Done</div>
              {completed.map(t=>(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:9,marginBottom:6,background:'#F5F6FA',opacity:.65}}>
                  <div style={{width:28,height:28,borderRadius:7,background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{t.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'#94A3B8',textDecoration:'line-through',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{t.title}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,padding:'1px 7px',borderRadius:999,background:'#ECFDF5',color:'#10B981',flexShrink:0}}>✓</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit request */}
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:20,display:'flex',flexDirection:'column' as const}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:600,color:'#0D0D1A'}}>Submit a request</div>
            {requests.length>0&&(
              <button onClick={()=>setShowReqHistory(true)} style={{fontSize:11,fontWeight:600,color:'#6C63FF',background:'#EEF0FF',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                📋 History ({requests.length})
              </button>
            )}
          </div>
          {/* Revision progress bar */}
          <div style={{background:'#F5F6FA',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:'#0D0D1A'}}>{left} of {client.monthly_revisions??5} revisions left</span>
              <span style={{fontSize:11,color:'#94A3B8'}}>Resets 1st of next month</span>
            </div>
            <div style={{height:6,background:'#E8EAF0',borderRadius:999,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:left===0?'#EF4444':left===1?'#F59E0B':'linear-gradient(90deg,#6C63FF,#A855F7)',borderRadius:999,transition:'width .4s'}}/>
            </div>
            {left===0&&<div style={{fontSize:11,color:'#F59E0B',marginTop:4}}>⚠ Limit reached — new requests will queue for next month.</div>}
            {left===1&&<div style={{fontSize:11,color:'#F59E0B',marginTop:4}}>Last revision this month — use it wisely!</div>}
          </div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:10,flex:1}}>
            <input value={reqTitle} onChange={e=>setReqTitle(e.target.value)} placeholder="What do you need changed? *"
              style={{fontSize:13,padding:'9px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',boxSizing:'border-box' as const,width:'100%'}}/>
            <textarea value={reqDesc} onChange={e=>setReqDesc(e.target.value)} placeholder="More details… (which page, what text, any references)" rows={2}
              style={{fontSize:13,padding:'9px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const,width:'100%'}}/>
            <input value={reqLink} onChange={e=>setReqLink(e.target.value)} placeholder="Reference link (optional)"
              style={{fontSize:13,padding:'9px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',boxSizing:'border-box' as const,width:'100%'}}/>
            <div onClick={()=>reqFileRef.current?.click()} style={{border:'1.5px dashed #E8EAF0',borderRadius:9,padding:12,textAlign:'center',cursor:'pointer',background:'#F5F6FA'}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='#6C63FF')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E8EAF0')}>
              <div style={{fontSize:13,color:reqFile?'#6C63FF':'#64748B',fontWeight:reqFile?600:400}}>{reqFile?'📎 '+reqFile:'📎 Attach a file (optional)'}</div>
            </div>
            <input ref={reqFileRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)setReqFile(f.name)}}/>
            {reqError&&<div style={{fontSize:12,color:'#EF4444',background:'#FEF2F2',padding:'7px 10px',borderRadius:7}}>{reqError}</div>}
            <button onClick={submitRequest} disabled={submitting} style={{padding:'10px',background:reqSuccess?'linear-gradient(135deg,#10B981,#059669)':'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',marginTop:'auto'}}>
              {reqSuccess?'✓ Submitted!':submitting?'Submitting…':left<=0?'Add to next month →':'Submit request →'}
            </button>
          </div>
        </div>

        {/* Messaging */}
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,display:'flex',flexDirection:'column' as const,overflow:'hidden'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid #E8EAF0',fontSize:14,fontWeight:600,color:'#0D0D1A',flexShrink:0}}>Messages</div>
          <div style={{flex:1,overflowY:'auto' as const,padding:'12px 14px',display:'flex',flexDirection:'column' as const,gap:8,minHeight:220,maxHeight:400}}>
            {messages.length===0&&<div style={{textAlign:'center',padding:24,color:'#94A3B8',fontSize:13}}>No messages yet. Say hello! 👋</div>}
            {messages.map(m=>(
              <div key={m.id} style={{display:'flex',justifyContent:m.from_admin?'flex-start':'flex-end'}}>
                <div style={{maxWidth:'82%',padding:'8px 12px',borderRadius:m.from_admin?'4px 12px 12px 12px':'12px 4px 12px 12px',background:m.from_admin?'#F5F6FA':'linear-gradient(135deg,#6C63FF,#A855F7)',border:m.from_admin?'1px solid #E8EAF0':'none'}}>
                  <div style={{fontSize:10,fontWeight:600,marginBottom:2,color:m.from_admin?'#6C63FF':'rgba(255,255,255,.75)'}}>{m.from_admin?'Studio':'You'}</div>
                  <div style={{fontSize:13,color:m.from_admin?'#0D0D1A':'#fff',lineHeight:1.5}}>{m.text}</div>
                  <div style={{fontSize:10,marginTop:2,color:m.from_admin?'#94A3B8':'rgba(255,255,255,.6)'}}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'10px 12px',borderTop:'1px solid #E8EAF0',display:'flex',gap:8,flexShrink:0}}>
            <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Write a message…"
              style={{flex:1,fontSize:13,padding:'9px 12px',border:'1.5px solid #E8EAF0',borderRadius:9,background:'#F5F6FA',outline:'none'}}/>
            <button onClick={sendMessage} disabled={sending||!msgText.trim()} style={{padding:'9px 16px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!msgText.trim()||sending)?0.5:1}}>
              {sending?'…':'Send'}
            </button>
          </div>
        </div>

      </div>

      {/* ── BILLING STRIP ── */}
      <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'18px 24px',display:'flex',alignItems:'center',gap:32,flexWrap:'wrap' as const}}>
        <div style={{fontSize:13,fontWeight:600,color:'#0D0D1A'}}>Billing</div>
        {[
          ['Plan','Monthly retainer'],
          ['Amount',`$${client.monthly_retainer}/mo`],
          ['Next payment',client.next_payment??'Contact studio'],
          ['Status','Paid up to date'],
        ].map(([l,v])=>(
          <div key={l}>
            <div style={{fontSize:11,color:'#94A3B8',marginBottom:2}}>{l}</div>
            <div style={{fontSize:13,fontWeight:600,color:l==='Status'?'#10B981':'#0D0D1A'}}>{v}</div>
          </div>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={()=>alert('Contact your studio to update payment info.')} style={{padding:'7px 14px',background:'#F5F6FA',color:'#64748B',border:'1px solid #E8EAF0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>Update card</button>
          <button onClick={()=>alert('Your studio will reach out to discuss cancellation.')} style={{padding:'7px 14px',background:'#FEF2F2',color:'#EF4444',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>Cancel plan</button>
        </div>
      </div>

    </div>
  )
}
