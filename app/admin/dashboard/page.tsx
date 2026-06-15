'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const PILL: Record<string, {bg:string,color:string,label:string}> = {
  active:  { bg:'#ECFDF5', color:'#10B981', label:'Active'    },
  review:  { bg:'#FFFBEB', color:'#F59E0B', label:'In Review' },
  pending: { bg:'#F5F6FA', color:'#64748B', label:'Pending'   },
}

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([])
  const [openTasks, setOpenTasks] = useState(0)
  const [pendingReqs, setPendingReqs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*', { count:'exact', head:true }).eq('done', false),
      supabase.from('requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
    ]).then(([c, t, r]) => {
      setClients(c.data ?? [])
      setOpenTasks(t.count ?? 0)
      setPendingReqs(r.count ?? 0)
      setLoading(false)
    })
  }, [])

  const mrr = clients.reduce((s, c) => s + (c.monthly_retainer ?? 0), 0)
  const activeCount = clients.filter(c => c.status === 'active').length

  const metrics = [
    { label:'Monthly Recurring', value: loading?'…':`$${mrr}`, color:'linear-gradient(135deg,#6C63FF,#A855F7)', shadow:'rgba(108,99,255,.3)' },
    { label:'Active Clients',    value: loading?'…':String(activeCount), color:'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow:'rgba(255,107,157,.3)' },
    { label:'Open Tasks',        value: loading?'…':String(openTasks), color:'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow:'rgba(59,130,246,.3)' },
    { label:'New Requests',      value: loading?'…':String(pendingReqs), color:'linear-gradient(135deg,#10B981,#059669)', shadow:'rgba(16,185,129,.3)' },
  ]

  return (
    <div>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Overview</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Dashboard</div>
        </div>
        <a href="/admin/clients/new" style={{ padding:'8px 14px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>+ Add client</a>
      </div>
      <div style={{ padding:'16px' }}>
        {/* Metric cards - responsive grid via style tag */}
        <style>{`
          .dash-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
          @media(max-width:768px) { .dash-metrics { grid-template-columns:1fr 1fr; gap:10px; } }
          .dash-grid { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
          @media(max-width:768px) { .dash-grid { grid-template-columns:1fr; } }
        `}</style>
        <div className="dash-metrics">
          {metrics.map(c => (
            <div key={c.label} style={{ background:c.color, borderRadius:18, padding:'16px 18px', boxShadow:`0 8px 24px ${c.shadow}`, minHeight:100, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-16, right:-16, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{c.label}</div>
              <div style={{ fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-.03em', position:'relative', zIndex:1 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div className="dash-grid">
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #E8EAF0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Clients ({clients.length})</span>
              <a href="/admin/clients" style={{ fontSize:12, color:'#6C63FF', textDecoration:'none' }}>See all →</a>
            </div>
            {clients.length === 0 && <div style={{ padding:'32px 20px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>No clients yet. <a href="/admin/clients/new" style={{ color:'#6C63FF' }}>Add one →</a></div>}
            {clients.slice(0,5).map((c, i) => {
              const p = PILL[c.status] ?? PILL.pending
              return (
                <a key={c.id} href={`/admin/clients/${c.id}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:i<Math.min(clients.length,5)-1?'1px solid #E8EAF0':'none', textDecoration:'none', color:'inherit' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F5F6FA')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'#EEF0FF', color:'#6C63FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {c.name.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{c.type}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:999, background:p.bg, color:p.color, flexShrink:0 }}>{p.label}</span>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D0D1A', flexShrink:0 }}>${c.monthly_retainer}<span style={{ fontSize:10, fontWeight:400, color:'#94A3B8' }}>/mo</span></div>
                </a>
              )
            })}
          </div>
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:14, padding:'14px 18px' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Upcoming payments</div>
            {clients.length === 0 && <div style={{ color:'#94A3B8', fontSize:13 }}>No payments yet.</div>}
            {clients.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #E8EAF0' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#0D0D1A' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{c.next_payment??'Not set'}</div>
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
