'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const DOT_COLORS = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444']

export default function RevenuePage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setClients(data ?? []); setLoading(false) })
  }, [])

  const mrr = clients.reduce((s, c) => s + (c.monthly_retainer ?? 0), 0)
  const setupTotal = clients.reduce((s, c) => s + (c.setup_fee ?? 0), 0)
  const ytd = mrr * 6 + setupTotal // rough estimate

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Revenue</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Revenue</div>
      </div>
      <div style={{ padding:'24px 32px' }}>
        {/* Metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'MRR', value: loading ? '…' : `$${mrr}`, color:'linear-gradient(135deg,#6C63FF,#A855F7)', shadow:'rgba(108,99,255,.3)' },
            { label:'YTD Estimate', value: loading ? '…' : `$${ytd}`, color:'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow:'rgba(59,130,246,.3)' },
            { label:'Outstanding', value: loading ? '…' : `$${mrr}`, color:'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow:'rgba(255,107,157,.3)' },
          ].map(c => (
            <div key={c.label} style={{ background:c.color, borderRadius:20, padding:20, boxShadow:`0 8px 24px ${c.shadow}`, minHeight:120, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{c.label}</div>
              <div style={{ fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-.03em', position:'relative', zIndex:1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Revenue by client */}
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Revenue by client</div>
            {loading && <div style={{ color:'#94A3B8', fontSize:13 }}>Loading…</div>}
            {!loading && clients.length === 0 && <div style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:24 }}>No clients yet.</div>}
            {clients.map((c, i) => {
              const total = (c.monthly_retainer ?? 0) * 3 + (c.setup_fee ?? 0)
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #E8EAF0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:DOT_COLORS[i%DOT_COLORS.length], flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#0D0D1A' }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
                        {c.setup_fee > 0 ? `$${c.setup_fee} setup + ` : ''}${c.monthly_retainer}/mo retainer
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0D0D1A' }}>${total}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>est. 3 months</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upcoming payments */}
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:24 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Upcoming payments</div>
            {loading && <div style={{ color:'#94A3B8', fontSize:13 }}>Loading…</div>}
            {!loading && clients.length === 0 && <div style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:24 }}>No clients yet.</div>}
            {clients.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #E8EAF0' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#0D0D1A' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.next_payment ?? 'No date set'}</div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0D0D1A' }}>${c.monthly_retainer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
