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
  const [client, setClient]         = useState<any>(null)
  const [clientTasks, setClientTasks] = useState<any[]>([])
  const [messages, setMessages]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<any>(null)
  const [response, setResponse]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [msgText, setMsgText]       = useState('')
  const [sending, setSending]       = useState(false)
  const [fileLabel, setFileLabel]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        Promise.all([
          supabase.from('client_tasks').select('*').eq('client_id', c.id).order('created_at'),
          supabase.from('messages').select('*').eq('client_id', c.id).order('created_at'),
        ]).then(([ct, m]) => {
          setClientTasks(ct.data ?? [])
          setMessages(m.data ?? [])
          setLoading(false)
        })
        // realtime messages
        supabase.channel('portal-msgs').on('postgres_changes',
          { event:'INSERT', schema:'public', table:'messages', filter:`client_id=eq.${c.id}` },
          payload => setMessages(ms => [...ms, payload.new as any])
        ).subscribe()
      })
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function completeTask() {
    if (!modal) return
    setSaving(true)
    const supabase = createClient()
    const resp = fileLabel ? `File: ${fileLabel}${response ? ' — ' + response : ''}` : response || 'Submitted'
    await supabase.from('client_tasks').update({ done: true, response: resp }).eq('id', modal.id)
    setClientTasks(t => t.map(x => x.id === modal.id ? { ...x, done: true, response: resp } : x))
    setModal(null); setResponse(''); setFileLabel(''); setSaving(false)
  }

  async function sendMessage() {
    if (!msgText.trim() || !client) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({ client_id: client.id, from_admin: false, text: msgText.trim() })
    setMsgText(''); setSending(false)
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading your portal…</div>
  if (!client) return <div style={{padding:48,textAlign:'center',fontFamily:'Inter,sans-serif'}}><div style={{fontSize:32,marginBottom:16}}>⏳</div><div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Your portal is being set up</div><div style={{fontSize:13,color:'#94A3B8'}}>Your studio will have it ready shortly.</div></div>

  const done = clientTasks.filter(t => t.done).length
  const left = (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0)
  const step = client.progress_step ?? 1
  const pending = clientTasks.filter(t => !t.done)
  const completed = clientTasks.filter(t => t.done)

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 40px',maxWidth:960,margin:'0 auto'}}>

      {/* Task modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e=>e.target===e.currentTarget&&(setModal(null),setResponse(''),setFileLabel(''))}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:22,marginBottom:8}}>{modal.emoji}</div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:6,color:'#0D0D1A'}}>{modal.title}</div>
            <div style={{fontSize:13,color:'#64748B',marginBottom:20,lineHeight:1.6}}>{modal.description}</div>
            {(modal.type==='file'||modal.type==='text') && (
              <div>
                {/* File upload always available */}
                <div onClick={()=>fileRef.current?.click()} style={{border:'1.5px dashed #E8EAF0',borderRadius:10,padding:20,textAlign:'center',marginBottom:14,cursor:'pointer',background:'#F5F6FA',transition:'border-color .14s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#6C63FF')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E8EAF0')}>
                  <div style={{fontSize:22,marginBottom:6}}>📎</div>
                  <div style={{fontSize:13,color:fileLabel?'#6C63FF':'#64748B',fontWeight:fileLabel?600:400}}>{fileLabel?'✓ '+fileLabel:'Click to attach a file'}</div>
                  <div style={{fontSize:11,color:'#94A3B8',marginTop:3}}>PNG, SVG, PDF, ZIP, DOCX accepted</div>
                </div>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]; if(f) setFileLabel(f.name) }}/>
                <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder={modal.type==='file'?'Add a note (optional)…':'Type your response here…'} rows={3}
                  style={{width:'100%',fontSize:13,padding:'10px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </div>
            )}
            {modal.type==='review' && (
              <div>
                <div style={{background:'#F5F6FA',borderRadius:10,padding:16,fontSize:13,color:'#64748B',lineHeight:1.7,marginBottom:14}}>
                  Review the content your studio has prepared and share your feedback below.
                </div>
                <div onClick={()=>fileRef.current?.click()} style={{border:'1.5px dashed #E8EAF0',borderRadius:10,padding:14,textAlign:'center',marginBottom:14,cursor:'pointer',background:'#F5F6FA'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#6C63FF')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E8EAF0')}>
                  <div style={{fontSize:13,color:fileLabel?'#6C63FF':'#64748B',fontWeight:fileLabel?600:400}}>{fileLabel?'✓ '+fileLabel:'📎 Attach reference file (optional)'}</div>
                </div>
                <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]; if(f) setFileLabel(f.name) }}/>
                <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Looks great! / Please change… / Can you add…" rows={4}
                  style={{width:'100%',fontSize:13,padding:'10px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>{setModal(null);setResponse('');setFileLabel('')}} style={{flex:1,padding:'10px',background:'#F5F6FA',color:'#64748B',border:'1px solid #E8EAF0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={completeTask} disabled={saving} style={{flex:2,padding:'10px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {saving?'Submitting…':'Submit & mark done →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero banner */}
      <div style={{background:'linear-gradient(135deg,#6C63FF 0%,#A855F7 100%)',borderRadius:20,padding:'28px 32px',color:'#fff',marginBottom:20,position:'relative',overflow:'hidden',boxShadow:'0 8px 24px rgba(108,99,255,.25)'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase' as const,opacity:.7,marginBottom:6}}>{client.type}</div>
        <div style={{fontSize:26,fontWeight:700,letterSpacing:'-.02em',marginBottom:4,position:'relative'}}>{client.name}</div>
        <div style={{fontSize:13,opacity:.75,marginBottom:20}}>Active plan · ${client.monthly_retainer}/month</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap' as const}}>
          {[{val:`${done}/${clientTasks.length}`,lbl:'Tasks done'},{val:`${left} left`,lbl:'Requests this month'},{val:client.next_payment??'TBD',lbl:'Next payment'}].map(s=>(
            <div key={s.lbl} style={{background:'rgba(255,255,255,.15)',borderRadius:12,padding:'10px 18px',backdropFilter:'blur(10px)'}}>
              <div style={{fontSize:18,fontWeight:700}}>{s.val}</div>
              <div style={{fontSize:11,opacity:.7,marginTop:2}}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:18,color:'#0D0D1A'}}>Website progress</div>
        <div style={{display:'flex',alignItems:'flex-start'}}>
          {STEPS.map((s,i)=>{
            const isDone=i<step; const isActive=i===step
            return (
              <div key={s.label} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',position:'relative'}}>
                {i<STEPS.length-1&&<div style={{position:'absolute',top:13,left:'50%',right:'-50%',height:2,background:isDone?'#10B981':'#E8EAF0',zIndex:0,transition:'background .4s'}}/>}
                <div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${isDone?'#10B981':isActive?'#6C63FF':'#E8EAF0'}`,background:isDone?'#10B981':isActive?'#6C63FF':'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,position:'relative',zIndex:1,marginBottom:8,boxShadow:isActive?'0 0 0 4px rgba(108,99,255,.15)':'none',transition:'all .3s'}}>
                  {isDone?<svg viewBox="0 0 24 24" style={{width:12,height:12}} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:<span style={{color:isActive?'#fff':'#94A3B8',fontSize:12}}>{s.icon}</span>}
                </div>
                <div style={{fontSize:11,fontWeight:600,textAlign:'center',color:isDone?'#10B981':isActive?'#6C63FF':'#94A3B8'}}>{s.label}</div>
                <div style={{fontSize:10,color:'#94A3B8',textAlign:'center',marginTop:2}}>{s.sub}</div>
                {isActive&&s.label==='Your Review'&&<div style={{fontSize:10,fontWeight:600,color:'#F59E0B',marginTop:4}}>⚠ Needs your input</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

        {/* Action items */}
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 24px'}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:4,color:'#0D0D1A'}}>Action items</div>
          <div style={{fontSize:12,color:'#94A3B8',marginBottom:16}}>Click any task to respond or attach files.</div>

          {pending.length===0&&completed.length===0&&(
            <div style={{textAlign:'center',padding:'24px 0',color:'#94A3B8',fontSize:13}}>No action items yet 🎉</div>
          )}

          {pending.map(t=>(
            <div key={t.id} onClick={()=>{setModal(t);setResponse('');setFileLabel('')}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px',borderRadius:12,border:'1px solid #E8EAF0',marginBottom:8,cursor:'pointer',transition:'all .14s',background:'#fff'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#6C63FF';e.currentTarget.style.background='#FAFAFF'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#E8EAF0';e.currentTarget.style.background='#fff'}}>
              <div style={{width:40,height:40,borderRadius:10,background:'#EEF0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{t.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'#0D0D1A'}}>{t.title}</div>
                <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{t.description?.substring(0,55)}{(t.description?.length??0)>55?'…':''}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column' as const,alignItems:'flex-end',gap:4}}>
                <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:999,background:'#EEF0FF',color:'#6C63FF',whiteSpace:'nowrap' as const}}>{t.type==='file'?'📎 File':t.type==='review'?'🔍 Review':'📝 Text'}</span>
                <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}

          {completed.length>0&&(
            <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #E8EAF0'}}>
              <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#94A3B8',marginBottom:10}}>Completed</div>
              {completed.map(t=>(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:6,background:'#F5F6FA',opacity:.7}}>
                  <div style={{width:32,height:32,borderRadius:8,background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{t.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,color:'#94A3B8',textDecoration:'line-through'}}>{t.title}</div>
                    {t.response&&<div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>✓ {t.response.substring(0,50)}</div>}
                  </div>
                  <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:999,background:'#ECFDF5',color:'#10B981'}}>Done</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live messages */}
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,display:'flex',flexDirection:'column' as const,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #E8EAF0',fontSize:14,fontWeight:600,color:'#0D0D1A',flexShrink:0}}>
            Messages with your studio
          </div>
          <div style={{flex:1,overflowY:'auto' as const,padding:'14px 16px',display:'flex',flexDirection:'column' as const,gap:8,minHeight:200,maxHeight:380}}>
            {messages.length===0&&<div style={{textAlign:'center',padding:24,color:'#94A3B8',fontSize:13}}>No messages yet. Say hello! 👋</div>}
            {messages.map(m=>(
              <div key={m.id} style={{display:'flex',justifyContent:m.from_admin?'flex-start':'flex-end'}}>
                <div style={{maxWidth:'80%',padding:'9px 13px',borderRadius:m.from_admin?'4px 12px 12px 12px':'12px 4px 12px 12px',background:m.from_admin?'#F5F6FA':'linear-gradient(135deg,#6C63FF,#A855F7)',border:m.from_admin?'1px solid #E8EAF0':'none',boxShadow:m.from_admin?'none':'0 4px 12px rgba(108,99,255,.2)'}}>
                  <div style={{fontSize:10,fontWeight:600,marginBottom:3,color:m.from_admin?'#6C63FF':'rgba(255,255,255,.75)'}}>{m.from_admin?'Studio':'You'}</div>
                  <div style={{fontSize:13,color:m.from_admin?'#0D0D1A':'#fff',lineHeight:1.5}}>{m.text}</div>
                  <div style={{fontSize:10,marginTop:3,color:m.from_admin?'#94A3B8':'rgba(255,255,255,.6)'}}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'10px 12px',borderTop:'1px solid #E8EAF0',display:'flex',gap:8,flexShrink:0}}>
            <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Write a message…"
              style={{flex:1,fontSize:13,padding:'9px 12px',border:'1.5px solid #E8EAF0',borderRadius:10,background:'#F5F6FA',outline:'none'}}/>
            <button onClick={sendMessage} disabled={sending||!msgText.trim()} style={{padding:'9px 18px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!msgText.trim()||sending)?0.5:1}}>
              {sending?'…':'Send'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
