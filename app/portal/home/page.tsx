'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const STEPS = [
  { label:'Submitted',   icon:'📥', sub:'Request received'  },
  { label:'In Progress', icon:'⚙️', sub:"We're building it" },
  { label:'Your Review', icon:'👀', sub:'Action needed'     },
  { label:'Completed',   icon:'✅', sub:'Live on your site' },
]

export default function PortalHomePage() {
  const [client, setClient] = useState<any>(null)
  const [clientTasks, setClientTasks] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        Promise.all([
          supabase.from('client_tasks').select('*').eq('client_id', c.id).order('created_at'),
          supabase.from('messages').select('*').eq('client_id', c.id).order('created_at', { ascending: false }).limit(3),
        ]).then(([ct, m]) => {
          setClientTasks(ct.data ?? [])
          setMessages((m.data ?? []).reverse())
          setLoading(false)
        })
      })
    })
  }, [])

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading your portal…</div>
  if (!client) return <div style={{padding:48,textAlign:'center',fontFamily:'Inter,sans-serif'}}><div style={{fontSize:32,marginBottom:16}}>⏳</div><div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Your portal is being set up</div><div style={{fontSize:13,color:'#94A3B8'}}>Your studio will have it ready shortly.</div></div>

  const done = clientTasks.filter(t => t.done).length
  const left = (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0)
  const step = client.progress_step ?? 1

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 40px',maxWidth:900,margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,#6C63FF 0%,#A855F7 100%)',borderRadius:20,padding:'28px 32px',color:'#fff',marginBottom:20,position:'relative',overflow:'hidden',boxShadow:'0 8px 24px rgba(108,99,255,.25)'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase' as const,opacity:.7,marginBottom:6}}>{client.type}</div>
        <div style={{fontSize:24,fontWeight:700,letterSpacing:'-.02em',marginBottom:4,position:'relative'}}>{client.name}</div>
        <div style={{fontSize:13,opacity:.75,marginBottom:20}}>Active plan · ${client.monthly_retainer}/month</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap' as const}}>
          {[{val:`${done}/${clientTasks.length}`,lbl:'Tasks done'},{val:`${left} left`,lbl:'Requests this month'},{val:client.next_payment??'TBD',lbl:'Next payment'}].map(s=>(
            <div key={s.lbl} style={{background:'rgba(255,255,255,.15)',borderRadius:12,padding:'10px 16px'}}>
              <div style={{fontSize:18,fontWeight:700}}>{s.val}</div>
              <div style={{fontSize:11,opacity:.7,marginTop:2}}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 24px',marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Website progress</div>
        <div style={{display:'flex',alignItems:'flex-start'}}>
          {STEPS.map((s,i)=>{
            const isDone=i<step; const isActive=i===step
            return (
              <div key={s.label} style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',position:'relative'}}>
                {i<STEPS.length-1&&<div style={{position:'absolute',top:13,left:'50%',right:'-50%',height:2,background:isDone?'#10B981':'#E8EAF0',zIndex:0}}/>}
                <div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${isDone?'#10B981':isActive?'#6C63FF':'#E8EAF0'}`,background:isDone?'#10B981':isActive?'#6C63FF':'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,position:'relative',zIndex:1,marginBottom:8,boxShadow:isActive?'0 0 0 4px rgba(108,99,255,.15)':'none'}}>
                  {isDone?<svg viewBox="0 0 24 24" style={{width:12,height:12}} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:<span style={{color:isActive?'#fff':'#94A3B8'}}>{s.icon}</span>}
                </div>
                <div style={{fontSize:11,fontWeight:600,textAlign:'center',color:isDone?'#10B981':isActive?'#6C63FF':'#94A3B8'}}>{s.label}</div>
                <div style={{fontSize:10,color:'#94A3B8',textAlign:'center',marginTop:2}}>{s.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:600}}>Action needed from you</span>
            <a href="/portal/tasks" style={{fontSize:12,color:'#6C63FF',textDecoration:'none'}}>See all →</a>
          </div>
          {clientTasks.filter(t=>!t.done).slice(0,3).map(t=>(
            <a key={t.id} href="/portal/tasks" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #E8EAF0',textDecoration:'none',color:'inherit'}}>
              <span style={{fontSize:20}}>{t.emoji}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#0D0D1A'}}>{t.title}</div><div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>{t.description?.substring(0,50)}</div></div>
              <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          ))}
          {clientTasks.filter(t=>!t.done).length===0&&<div style={{fontSize:13,color:'#94A3B8',padding:'16px 0',textAlign:'center'}}>No action needed right now 🎉</div>}
        </div>
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:'20px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:600}}>Recent messages</span>
            <a href="/portal/messages" style={{fontSize:12,color:'#6C63FF',textDecoration:'none'}}>See all →</a>
          </div>
          {messages.length===0&&<div style={{fontSize:13,color:'#94A3B8',padding:'16px 0',textAlign:'center'}}>No messages yet.</div>}
          {messages.map(m=>(
            <div key={m.id} style={{padding:'8px 0',borderBottom:'1px solid #E8EAF0'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:600,color:m.from_admin?'#6C63FF':'#0D0D1A'}}>{m.from_admin?'Studio':'You'}</span>
                <span style={{fontSize:11,color:'#94A3B8'}}>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{fontSize:13,color:'#64748B'}}>{m.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
