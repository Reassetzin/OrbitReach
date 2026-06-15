'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

export default function PortalRequestPage() {
  const [client, setClient] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title:'', description:'', link:'' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        supabase.from('requests').select('*').eq('client_id', c.id).order('created_at', { ascending: false })
          .then(({ data }) => { setRequests(data ?? []); setLoading(false) })
      })
    })
  }, [])

  async function submit() {
    if (!form.title.trim()) { setError('Please add a title'); return }
    const left = (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0)
    setSubmitting(true); setError('')
    const supabase = createClient()
    const status = left <= 0 ? 'backlog' : 'pending'
    const { data } = await supabase.from('requests').insert({
      client_id: client.id, title: form.title.trim(),
      description: form.description.trim() || null, link: form.link.trim() || null, status
    }).select().single()
    if (data) {
      setRequests(r => [data, ...r])
      if (left > 0) await supabase.from('clients').update({ revisions_used: (client.revisions_used ?? 0) + 1 }).eq('id', client.id)
      setClient((c: any) => ({ ...c, revisions_used: (c.revisions_used ?? 0) + 1 }))
    }
    setForm({ title:'', description:'', link:'' }); setSuccess(true); setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading…</div>

  const left = Math.max(0, (client?.monthly_revisions ?? 5) - (client?.revisions_used ?? 0))
  const pct = Math.round(((client?.revisions_used ?? 0) / (client?.monthly_revisions ?? 5)) * 100)

  const STATUS: Record<string,{bg:string,color:string,label:string}> = {
    pending:  { bg:'#FFFBEB', color:'#F59E0B', label:'Pending'    },
    accepted: { bg:'#ECFDF5', color:'#10B981', label:'Accepted'   },
    backlog:  { bg:'#EEF0FF', color:'#6C63FF', label:'Next month' },
    declined: { bg:'#FEF2F2', color:'#EF4444', label:'Declined'   },
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 40px',maxWidth:900,margin:'0 auto'}}>
      <div style={{fontSize:18,fontWeight:700,color:'#0D0D1A',marginBottom:4}}>Submit a request</div>
      <div style={{fontSize:13,color:'#94A3B8',marginBottom:24}}>Describe what you need changed or added to your site.</div>

      {left<=0&&(
        <div style={{background:'#FFFBEB',border:'1px solid rgba(245,158,11,.2)',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#F59E0B'}}>Monthly revision limit reached</div>
            <div style={{fontSize:12,color:'#64748B',marginTop:2}}>You've used all {client?.monthly_revisions} revisions this month. New requests will be queued for next month.</div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20,marginBottom:24}}>
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:24,display:'flex',flexDirection:'column' as const,gap:16}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#64748B',display:'block',marginBottom:6}}>Request title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Update the pricing on the services page"
              style={{width:'100%',fontSize:13,padding:'10px 14px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',boxSizing:'border-box' as const}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#64748B',display:'block',marginBottom:6}}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What page? What should change? Any references?" rows={4}
              style={{width:'100%',fontSize:13,padding:'10px 14px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.06em',color:'#64748B',display:'block',marginBottom:6}}>Reference link (optional)</label>
            <input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://…"
              style={{width:'100%',fontSize:13,padding:'10px 14px',border:'1.5px solid #E8EAF0',borderRadius:8,background:'#F5F6FA',outline:'none',boxSizing:'border-box' as const}}/>
          </div>
          {error&&<div style={{fontSize:12,color:'#EF4444',background:'#FEF2F2',padding:'8px 12px',borderRadius:8}}>{error}</div>}
          <button onClick={submit} disabled={submitting}
            style={{padding:'12px',background:success?'linear-gradient(135deg,#10B981,#059669)':'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 8px 24px rgba(108,99,255,.25)'}}>
            {success?'✓ Request submitted!':(submitting?'Submitting…':left<=0?'Add to next month queue →':'Submit request →')}
          </button>
        </div>

        <div style={{display:'flex',flexDirection:'column' as const,gap:16}}>
          <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Your revision allowance</div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'#64748B'}}>Used this month</span>
              <span style={{fontSize:12,fontWeight:600,color:'#0D0D1A'}}>{client?.revisions_used ?? 0} / {client?.monthly_revisions ?? 5}</span>
            </div>
            <div style={{height:8,background:'#F5F6FA',borderRadius:999,overflow:'hidden',marginBottom:16}}>
              <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:left<=1?'linear-gradient(90deg,#F59E0B,#EF4444)':'linear-gradient(90deg,#6C63FF,#A855F7)',borderRadius:999,transition:'width .4s'}}/>
            </div>
            {[['Monthly allowance',`${client?.monthly_revisions ?? 5} revisions`],['Used',`${client?.revisions_used ?? 0}`],['Remaining',`${left}`],['Resets','1st of next month']].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #E8EAF0'}}>
                <span style={{fontSize:12,color:'#64748B'}}>{l}</span>
                <span style={{fontSize:12,fontWeight:600,color:l==='Remaining'&&left<=0?'#EF4444':l==='Remaining'&&left<=1?'#F59E0B':'#0D0D1A'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {requests.length>0&&(
        <div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Past requests</div>
          <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,overflow:'hidden'}}>
            {requests.map((r,i)=>{
              const s=STATUS[r.status]??STATUS.pending
              return (
                <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:i<requests.length-1?'1px solid #E8EAF0':'none'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:'#0D0D1A'}}>{r.title}</div>
                    <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,background:s.bg,color:s.color}}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
