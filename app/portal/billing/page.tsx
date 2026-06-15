'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

export default function PortalBillingPage() {
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single()
        .then(({ data: c }) => { setClient(c); setLoading(false) })
    })
  }, [])

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading…</div>
  if (!client) return null

  return (
    <div style={{fontFamily:'Inter,sans-serif',padding:'24px 24px 40px',maxWidth:700,margin:'0 auto'}}>
      <div style={{fontSize:18,fontWeight:700,color:'#0D0D1A',marginBottom:24}}>Billing</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:'#fff',border:'1px solid #E8EAF0',borderRadius:16,padding:24}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Current plan</div>
          {[
            ['Plan','Monthly retainer'],
            ['Monthly amount',`$${client.monthly_retainer}/month`],
            ['Setup fee',client.setup_fee>0?`$${client.setup_fee} (paid)`:'—'],
            ['Next payment',client.next_payment??'Contact studio'],
            ['Revisions / month',`${client.monthly_revisions??5} included`],
            ['Status','Paid up to date'],
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #E8EAF0'}}>
              <span style={{fontSize:12,color:'#64748B'}}>{l}</span>
              <span style={{fontSize:13,fontWeight:600,color:l==='Status'?'#10B981':'#0D0D1A'}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
          {[
            { icon:'💳', title:'Update payment info', sub:'Change your card or billing details', action:()=>alert('Contact your studio to update payment info.') },
            { icon:'🧾', title:'View past invoices', sub:'Download PDFs of previous payments', action:()=>alert('Invoice download coming soon. Contact your studio.') },
            { icon:'⚠️', title:'Request cancellation', sub:'Submit a cancellation request', action:()=>alert('A cancellation request will be sent to your studio.'), danger:true },
          ].map(item=>(
            <button key={item.title} onClick={item.action}
              style={{display:'flex',alignItems:'center',gap:12,padding:16,background:'#fff',border:`1px solid ${item.danger?'rgba(239,68,68,.2)':'#E8EAF0'}`,borderRadius:12,cursor:'pointer',textAlign:'left' as const,transition:'all .14s'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#F5F6FA')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
              <span style={{fontSize:22}}>{item.icon}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:item.danger?'#EF4444':'#0D0D1A'}}>{item.title}</div>
                <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
