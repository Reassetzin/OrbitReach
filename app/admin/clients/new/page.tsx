'use client'
import { useState } from 'react'
import { createClient } from '@/supabase/client'

export default function NewClientPage() {
  const [form, setForm] = useState({ name:'', contact:'', email:'', type:'Website + booking', setup:'', retainer:'', revisions:'5', status:'pending' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Business name is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('clients').insert({
      name: form.name.trim(), contact: form.contact.trim() || null,
      email: form.email.trim(), type: form.type,
      setup_fee: parseInt(form.setup) || 0,
      monthly_retainer: parseInt(form.retainer) || 0,
      monthly_revisions: parseInt(form.revisions) || 5,
      status: form.status, revisions_used: 0, progress_step: 0,
    })
    if (err) { setError(err.message); setSaving(false); return }
    window.location.href = '/admin/clients'
  }

  const inp = { fontSize: 15, padding: '13px 14px', border: '1.5px solid #E8EAF0', borderRadius: 10, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box' } as any
  const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748B', display: 'block', marginBottom: 6 } as any

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .form-header { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid #E8EAF0; background:#fff; position:sticky; top:0; z-index:10; }
        .form-body { padding:20px 24px; max-width:560px; }
        @media(max-width:768px){ .form-header { padding:12px 16px; } .form-body { padding:16px; max-width:100%; } }
        .form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:480px){ .form-grid2 { grid-template-columns:1fr; } }
      `}</style>
      <div className="form-header">
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Studio / Clients / New</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0D0D1A' }}>Add client</div>
        </div>
        <a href="/admin/clients" style={{ padding: '8px 14px', background: '#F5F6FA', color: '#64748B', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #E8EAF0' }}>← Back</a>
      </div>
      <div className="form-body">
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E8EAF0', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div><label style={lbl}>Business name *</label><input style={inp} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Sunrise Pool Service" required/></div>
          <div><label style={lbl}>Contact name</label><input style={inp} value={form.contact} onChange={e => update('contact', e.target.value)} placeholder="e.g. John Smith"/></div>
          <div><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@business.com"/></div>
          <div>
            <label style={lbl}>Service type</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.type} onChange={e => update('type', e.target.value)}>
              {['Website + booking','Web maintenance','CRE marketing','Custom'].map(o => <option key={o}>{o}</option>)}
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
          <div style={{ padding: '12px 14px', background: '#EEF0FF', borderRadius: 10, fontSize: 12, color: '#6C63FF', lineHeight: 1.5 }}>
            💡 After saving, go to Supabase → Authentication → Invite user with the client's email to give them portal access.
          </div>
          {error && <div style={{ padding: '12px 14px', background: '#FEF2F2', color: '#EF4444', borderRadius: 10, fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={saving}
            style={{ padding: '15px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,99,255,.3)' }}>
            {saving ? 'Saving…' : 'Add client →'}
          </button>
        </form>
      </div>
    </div>
  )
}
