'use client'
import { useState } from 'react'
import { createClient } from '@/supabase/client'

export default function NewClientPage() {
  const [form, setForm] = useState({ name:'', contact:'', email:'', type:'Website + booking', setup:'', retainer:'', revisions:'5', status:'active' })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [inviting, setInviting] = useState(false)
  const [done,     setDone]     = useState<{ clientName: string; invited: boolean } | null>(null)

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())  { setError('Business name is required'); return }
    if (!form.email.trim()) { setError('Email is required for portal access'); return }
    setSaving(true); setError('')

    const supabase = createClient()

    /* 1. Insert client row */
    const { data: client, error: err } = await supabase.from('clients').insert({
      name: form.name.trim(), contact: form.contact.trim() || null,
      email: form.email.trim(), type: form.type,
      setup_fee: parseInt(form.setup) || 0,
      monthly_retainer: parseInt(form.retainer) || 0,
      monthly_revisions: parseInt(form.revisions) || 5,
      status: form.status, revisions_used: 0, progress_step: 0,
    }).select().single()

    if (err || !client) { setError(err?.message ?? 'Failed to create client'); setSaving(false); return }

    /* 2. Send invite email via API */
    setInviting(true)
    let invited = false
    try {
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, email: form.email.trim(), name: form.name.trim() })
      })
      const json = await res.json()
      invited = json.success === true
    } catch { /* invite failed silently — client row still created */ }

    setSaving(false); setInviting(false)
    setDone({ clientName: form.name.trim(), invited })
  }

  const inp = { fontSize: 15, padding: '13px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box' } as any
  const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748B', display: 'block', marginBottom: 6 } as any

  /* ── Success screen ── */
  if (done) return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', border: '1px solid #E8EAF0' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" style={{ width: 28, height: 28 }} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>{done.clientName} added!</div>
        {done.invited ? (
          <div style={{ fontSize: 15, color: '#64748B', marginBottom: 6, lineHeight: 1.6 }}>
            ✉️ An invite email has been sent to <strong>{form.email}</strong> with a magic link to set their password and access the portal.
          </div>
        ) : (
          <div style={{ fontSize: 15, color: '#F59E0B', marginBottom: 6, lineHeight: 1.6 }}>
            ⚠️ Client created but invite email failed. You can manually invite them from Supabase → Authentication.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
          <a href="/admin/dashboard" style={{ padding: '11px 22px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Dashboard</a>
          <a href="/admin/clients/new" onClick={() => setDone(null)} style={{ padding: '11px 22px', background: '#F5F6FA', color: '#64748B', border: '1px solid #E8EAF0', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Add another</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F5F6FA', minHeight: '100vh' }}>
      <style>{`
        .form-header { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid #E8EAF0; background:#fff; position:sticky; top:0; z-index:10; }
        .form-body { padding:28px 24px; max-width:560px; margin: 0 auto; }
        .form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:480px){ .form-grid2 { grid-template-columns:1fr; } .form-body { padding:16px; } }
      `}</style>

      <div className="form-header">
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>Admin / Clients / New</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>Add new client</div>
        </div>
        <a href="/admin/dashboard" style={{ padding: '8px 14px', background: '#F5F6FA', color: '#64748B', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #E8EAF0' }}>← Dashboard</a>
      </div>

      <div className="form-body">
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Onboarding notice */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,rgba(108,99,255,.08),rgba(168,85,247,.06))', borderRadius: 12, border: '1px solid rgba(108,99,255,.15)', fontSize: 13, color: '#6C63FF', lineHeight: 1.6 }}>
            🚀 <strong>Auto-onboarding:</strong> When you save, we'll automatically send the client an invite email with a magic link to access their portal. No manual Supabase steps needed.
          </div>

          <div><label style={lbl}>Business name *</label><input style={inp} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Sunrise Pool Service" required/></div>
          <div><label style={lbl}>Contact name</label><input style={inp} value={form.contact} onChange={e => update('contact', e.target.value)} placeholder="e.g. John Smith"/></div>
          <div>
            <label style={lbl}>Client email * <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— invite will be sent here</span></label>
            <input style={inp} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@business.com" required/>
          </div>

          <div>
            <label style={lbl}>Service type</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.type} onChange={e => update('type', e.target.value)}>
              {['Website + booking','Web maintenance','CRE marketing','E-commerce','Custom'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="form-grid2">
            <div><label style={lbl}>Setup fee ($)</label><input style={inp} type="number" value={form.setup} onChange={e => update('setup', e.target.value)} placeholder="500"/></div>
            <div><label style={lbl}>Monthly retainer ($)</label><input style={inp} type="number" value={form.retainer} onChange={e => update('retainer', e.target.value)} placeholder="200"/></div>
          </div>

          <div><label style={lbl}>Monthly revisions</label><input style={inp} type="number" value={form.revisions} onChange={e => update('revisions', e.target.value)}/></div>

          <div>
            <label style={lbl}>Initial status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{v:'active',l:'Active'},{v:'review',l:'In Review'},{v:'pending',l:'Pending'}].map(s => (
                <button key={s.v} type="button" onClick={() => update('status', s.v)}
                  style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: `1.5px solid ${form.status===s.v?'#6C63FF':'#E8EAF0'}`, background: form.status===s.v?'#EEF0FF':'#F8FAFC', color: form.status===s.v?'#6C63FF':'#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: '12px 14px', background: '#FEF2F2', color: '#EF4444', borderRadius: 10, fontSize: 13 }}>{error}</div>}

          <button type="submit" disabled={saving || inviting}
            style={{ padding: '15px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,99,255,.3)', opacity: (saving || inviting) ? 0.7 : 1 }}>
            {inviting ? '✉️ Sending invite…' : saving ? 'Creating client…' : 'Add client & send invite →'}
          </button>
        </form>
      </div>
    </div>
  )
}
