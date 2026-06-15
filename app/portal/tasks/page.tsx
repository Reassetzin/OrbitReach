'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

export default function PortalTasksPage() {
  const [client, setClient] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        supabase.from('client_tasks').select('*').eq('client_id', c.id).order('created_at')
          .then(({ data }) => { setTasks(data ?? []); setLoading(false) })
      })
    })
  }, [])

  async function completeTask() {
    if (!modal) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('client_tasks').update({ done: true, response: response || 'Submitted' }).eq('id', modal.id)
    setTasks(t => t.map(x => x.id === modal.id ? { ...x, done: true, response: response || 'Submitted' } : x))
    setModal(null); setResponse(''); setSaving(false)
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading…</div>

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 40px',maxWidth:700,margin:'0 auto'}}>
      <div style={{fontSize:18,fontWeight:700,color:'#0D0D1A',marginBottom:4}}>Action items</div>
      <div style={{fontSize:13,color:'#94A3B8',marginBottom:24}}>Tasks your studio needs from you. Click any task to respond.</div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:480,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:20,marginBottom:6}}>{modal.emoji}</div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{modal.title}</div>
            <div style={{fontSize:13,color:'#64748B',marginBottom:20,lineHeight:1.6}}>{modal.description}</div>
            {modal.type==='file'&&(
              <div>
                <div style={{border:'1.5px dashed #E8EAF0',borderRadius:10,padding:24,textAlign:'center',marginBottom:16,cursor:'pointer',background:'#F5F6FA'}}>
                  <div style={{fontSize:24,marginBottom:8}}>📎</div>
                  <div style={{fontSize:13,color:'#64748B'}}>Click to upload a file</div>
                  <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>PNG, SVG, PDF, ZIP accepted</div>
                </div>
                <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Add a note (optional)…" rows={3}
                  style={{width:'100%',fontSize:13,padding:'8px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </div>
            )}
            {modal.type==='text'&&(
              <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Type your response here…" rows={4}
                style={{width:'100%',fontSize:13,padding:'8px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const,marginBottom:16}}/>
            )}
            {modal.type==='review'&&(
              <div>
                <div style={{background:'#F5F6FA',borderRadius:10,padding:16,fontSize:13,color:'#64748B',lineHeight:1.7,marginBottom:16}}>Review the content your studio has prepared and let them know if you approve or have changes.</div>
                <textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Looks great! / Please change… / Can you add…" rows={3}
                  style={{width:'100%',fontSize:13,padding:'8px 12px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>{setModal(null);setResponse('')}} style={{flex:1,padding:'10px',background:'#F5F6FA',color:'#64748B',border:'1px solid #E8EAF0',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={completeTask} disabled={saving} style={{flex:2,padding:'10px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {saving?'Submitting…':'Mark as done →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending.length===0&&done.length===0&&<div style={{textAlign:'center',padding:48,background:'#fff',border:'1px solid #E8EAF0',borderRadius:16}}><div style={{fontSize:32,marginBottom:12}}>🎉</div><div style={{fontSize:16,fontWeight:700,marginBottom:8}}>All caught up!</div><div style={{fontSize:13,color:'#94A3B8'}}>No action items from your studio yet.</div></div>}
      {pending.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#94A3B8',marginBottom:10}}>Needs your attention</div>
          {pending.map(t=>(
            <div key={t.id} onClick={()=>{setModal(t);setResponse('')}}
              style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:14,padding:16,marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',gap:14}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='#6C63FF')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#E8EAF0')}>
              <div style={{width:44,height:44,borderRadius:10,background:'#EEF0FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{t.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'#0D0D1A',marginBottom:4}}>{t.title}</div>
                <div style={{fontSize:12,color:'#64748B'}}>{t.description?.substring(0,80)}</div>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:999,background:'#EEF0FF',color:'#6C63FF',display:'inline-block',marginTop:6}}>Click to respond →</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {done.length>0&&(
        <div>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#94A3B8',marginBottom:10}}>Completed</div>
          {done.map(t=>(
            <div key={t.id} style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:14,padding:16,marginBottom:10,display:'flex',alignItems:'center',gap:14,opacity:.6}}>
              <div style={{width:44,height:44,borderRadius:10,background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{t.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'#94A3B8',textDecoration:'line-through'}}>{t.title}</div>
                {t.response&&<div style={{fontSize:12,color:'#94A3B8',marginTop:2}}>Response: {t.response.substring(0,60)}</div>}
              </div>
              <span style={{fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:999,background:'#ECFDF5',color:'#10B981'}}>✓ Done</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
