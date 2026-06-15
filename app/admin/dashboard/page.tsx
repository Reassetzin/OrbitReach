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

  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Overview</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Dashboard</div>
        </div>
        <a href="/admin/clients/new" style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', boxShadow:'0 8px 24px rgba(108,99,255,.25)' }}>+ Add client</a>
      </div>

      <div style={{ padding:'24px 32px' }}>
        {/* Metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Monthly Recurring', value: loading ? '…' : `$${mrr}`, color:'linear-gradient(135deg,#6C63FF,#A855F7)', shadow:'rgba(108,99,255,.3)' },
            { label:'Active Clients',    value: loading ? '…' : String(activeCount), color:'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow:'rgba(255,107,157,.3)' },
            { label:'Open Tasks',        value: loading ? '…' : String(openTasks), color:'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow:'rgba(59,130,246,.3)' },
            { label:'New Requests',      value: loading ? '…' : String(pendingReqs), color:'linear-gradient(135deg,#10B981,#059669)', shadow:'rgba(16,185,129,.3)' },
          ].map(c => (
            <div key={c.label} style={{ background:c.color, borderRadius:20, padding:20, boxShadow:`0 8px 24px ${c.shadow}`, minHeight:120, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{c.label}</div>
              <div style={{ fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-.03em', position:'relative', zIndex:1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Clients list */}
        {!loading && clients.length > 0 ? (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #E8EAF0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Clients ({clients.length})</span>
              <a href="/admin/clients" style={{ fontSize:12, color:'#6C63FF', textDecoration:'none' }}>See all →</a>
            </div>
            {clients.slice(0,5).map((c, i) => {
              const p = PILL[c.status] ?? PILL.pending
              return (
                <a key={c.id} href={`/admin/clients/${c.id}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom: i < Math.min(clients.length,5)-1 ? '1px solid #E8EAF0' : 'none', textDecoration:'none', color:'inherit' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#F5F6FA')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <div style={{ width:36, height:36, borderRadius:9, background:'#EEF0FF', color:'#6C63FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {c.name.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.type}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:999, background:p.bg, color:p.color }}>{p.label}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0D0D1A' }}>${c.monthly_retainer}<span style={{ fontSize:10, fontWeight:400, color:'#94A3B8' }}>/mo</span></div>
                  </div>
                  <svg style={{ width:14, height:14, flexShrink:0 }} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              )
            })}
          </div>
        ) : !loading && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:16 }}>🚀</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A', marginBottom:8 }}>Ready to go</div>
            <div style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Add your first client to get started.</div>
            <a href="/admin/clients/new" style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Add first client →</a>
          </div>
        )}
      </div>
    </div>
  )
}
