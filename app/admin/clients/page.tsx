'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const PILL: Record<string, {bg:string,color:string,label:string}> = {
  active:  { bg:'#ECFDF5', color:'#10B981', label:'Active'    },
  review:  { bg:'#FFFBEB', color:'#F59E0B', label:'In Review' },
  pending: { bg:'#F5F6FA', color:'#64748B', label:'Pending'   },
}
const AV_COLORS = ['#ECFDF5','#EEF0FF','#FFFBEB','#EFF6FF']
const AV_TEXT   = ['#10B981','#6C63FF','#92400E','#3B82F6']

function initials(name: string) {
  return name.split(' ').slice(0,2).map((w:string) => w[0]).join('').toUpperCase()
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setClients(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div><div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Clients</div><div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Clients {!loading && `(${clients.length})`}</div></div>
        <a href="/admin/clients/new" style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>+ Add client</a>
      </div>
      <div style={{ padding:'24px 32px' }}>
        {loading && <div style={{ textAlign:'center', padding:48, color:'#94A3B8' }}>Loading…</div>}
        {error && <div style={{ padding:16, background:'#FEF2F2', color:'#EF4444', borderRadius:8, fontSize:13 }}>{error}</div>}
        {!loading && clients.length === 0 && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:16 }}>👥</div>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No clients yet</div>
            <div style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Add your first client to get started.</div>
            <a href="/admin/clients/new" style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Add first client →</a>
          </div>
        )}
        {clients.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, overflow:'hidden' }}>
            {clients.map((c, i) => {
              const p = PILL[c.status] ?? PILL.pending
              return (
                <a key={c.id} href={`/admin/clients/${c.id}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < clients.length-1 ? '1px solid #E8EAF0' : 'none', textDecoration:'none', color:'inherit', transition:'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#F5F6FA')}
                  onMouseLeave={e => (e.currentTarget.style.background='#fff')}>
                  <div style={{ width:40, height:40, borderRadius:10, background:AV_COLORS[i%4], color:AV_TEXT[i%4], display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D0D1A' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.type}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:999, background:p.bg, color:p.color }}>{p.label}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0D0D1A' }}>${c.monthly_retainer}<span style={{ fontSize:10, fontWeight:400, color:'#94A3B8' }}>/mo</span></div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.next_payment ?? 'No payment set'}</div>
                  </div>
                  <svg style={{ width:14, height:14, flexShrink:0, marginLeft:4 }} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
