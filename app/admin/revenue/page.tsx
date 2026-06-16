'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const DOT = ['#6C63FF','#10B981','#F59E0B','#3B82F6','#EF4444']

export default function RevenuePage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient().from('clients').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setClients(data ?? []); setLoading(false) })
  }, [])

  const mrr      = clients.reduce((s, c) => s + (c.monthly_retainer ?? 0), 0)
  const setup    = clients.reduce((s, c) => s + (c.setup_fee ?? 0), 0)
  const ytd      = mrr * 6 + setup

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .rev-header { padding:14px 24px; border-bottom:1px solid #E8EAF0; background:#fff; position:sticky; top:0; z-index:10; }
        .rev-body { padding:20px 24px; }
        .rev-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
        .rev-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:768px){
          .rev-header { padding:12px 16px; }
          .rev-body { padding:12px 16px; }
          .rev-cards { grid-template-columns:1fr; gap:10px; }
          .rev-grid { grid-template-columns:1fr; }
        }
      `}</style>
      <div className="rev-header">
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Studio / Revenue</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>Revenue</div>
      </div>
      <div className="rev-body">
        <div className="rev-cards">
          {[
            { label: 'Monthly Recurring', value: loading ? '…' : `$${mrr}`, color: 'linear-gradient(135deg,#6C63FF,#A855F7)', shadow: 'rgba(108,99,255,.25)' },
            { label: 'YTD Estimate',      value: loading ? '…' : `$${ytd}`, color: 'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow: 'rgba(59,130,246,.25)' },
            { label: 'Outstanding',       value: loading ? '…' : `$${mrr}`, color: 'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow: 'rgba(255,107,157,.25)' },
          ].map(c => (
            <div key={c.label} style={{ background: c.color, borderRadius: 18, padding: '20px 22px', boxShadow: `0 8px 24px ${c.shadow}`, minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }}/>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-.03em', position: 'relative' }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div className="rev-grid">
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue by client</div>
            {loading && <div style={{ color: '#94A3B8', fontSize: 13 }}>Loading…</div>}
            {!loading && clients.length === 0 && <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 24 }}>No clients yet.</div>}
            {clients.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: DOT[i%DOT.length], flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>${c.monthly_retainer}/mo retainer</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D1A' }}>${(c.monthly_retainer ?? 0) * 3 + (c.setup_fee ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>est. 3 mo</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Upcoming payments</div>
            {!loading && clients.length === 0 && <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 24 }}>No clients yet.</div>}
            {clients.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{c.next_payment ?? 'No date set'}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D1A' }}>${c.monthly_retainer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
