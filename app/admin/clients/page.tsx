'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const PILL: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#ECFDF5', color: '#10B981', label: 'Active'    },
  review:  { bg: '#FFFBEB', color: '#F59E0B', label: 'In Review' },
  pending: { bg: '#F5F6FA', color: '#64748B', label: 'Pending'   },
}
const AV_BG   = ['#ECFDF5','#EEF0FF','#FFFBEB','#EFF6FF']
const AV_TEXT = ['#10B981','#6C63FF','#92400E','#3B82F6']

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

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
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .clients-header { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid #E8EAF0; background:#fff; position:sticky; top:0; z-index:10; }
        @media(max-width:768px){ .clients-header { padding:12px 16px; } }
        .clients-body { padding:20px 24px; }
        @media(max-width:768px){ .clients-body { padding:12px 16px; } }
        .client-row { display:flex; align-items:center; gap:14px; padding:14px 20px; border-bottom:1px solid #F1F5F9; text-decoration:none; color:inherit; }
        .client-row:hover { background:#F8FAFC; }
        @media(max-width:768px){ .client-row { padding:14px 16px; } }
      `}</style>
      <div className="clients-header">
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Studio / Clients</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>
            {loading ? 'Clients' : `Clients (${clients.length})`}
          </div>
        </div>
        <a href="/admin/clients/new" style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 12px rgba(108,99,255,.25)' }}>+ Add client</a>
      </div>
      <div className="clients-body">
        {loading && <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>Loading…</div>}
        {error && <div style={{ padding: 16, background: '#FEF2F2', color: '#EF4444', borderRadius: 10, fontSize: 13 }}>{error}</div>}
        {!loading && clients.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No clients yet</div>
            <div style={{ fontSize: 14, color: '#94A3B8', marginBottom: 24 }}>Add your first client to get started.</div>
            <a href="/admin/clients/new" style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Add first client →</a>
          </div>
        )}
        {clients.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, overflow: 'hidden' }}>
            {clients.map((c, i) => {
              const p = PILL[c.status] ?? PILL.pending
              const init = c.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
              return (
                <a key={c.id} href={`/admin/clients/${c.id}`} className="client-row">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: AV_BG[i%4], color: AV_TEXT[i%4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{c.type}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: p.bg, color: p.color }}>{p.label}</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>${c.monthly_retainer}<span style={{ fontSize: 11, fontWeight: 400, color: '#94A3B8' }}>/mo</span></div>
                  </div>
                  <svg style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 4 }} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
