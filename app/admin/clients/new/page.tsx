'use client'
import { useState } from 'react'
import { createClient } from '@/supabase/client'

export default function NewClientPage() {
  const [form, setForm] = useState({ name:'', contact:'', email:'', type:'Website + booking', setup:'', retainer:'', revisions:'5', status:'pending' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Business name is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.from('clients').insert({
      name: form.name.trim(),
      contact: form.contact.trim() || null,
      email: form.email.trim(),
      type: form.type,
      setup_fee: parseInt(form.setup) || 0,
      monthly_retainer: parseInt(form.retainer) || 0,
      monthly_revisions: parseInt(form.revisions) || 5,
      status: form.status,
      revisions_used: 0,
      progress_step: 1,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    window.location.href = '/admin/clients'
  }

  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div><div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Clients / New</div><div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Add client</div></div>
        <a href="/admin/clients" style={{ padding:'8px 16px', background:'#F5F6FA', color:'#64748B', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', border:'1px solid #E8EAF0' }}>← Back</a>
      </div>
      <div style={{ padding:'32px', maxWidth:560 }}>
        <form onSubmit={handleSubmit} style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:32, display:'flex', flexDirection:'column', gap:20 }}>
          {[
            { label:'Business name *', key:'name', placeholder:'e.g. Sunrise Pool Service', type:'text' },
            { label:'Contact name', key:'contact', placeholder:'e.g. John Smith', type:'text' },
            { label:'Email', key:'email', placeholder:'john@business.com', type:'email' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder}
                style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
            </div>
          ))}
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Service type</label>
            <select value={form.type} onChange={e => update('type', e.target.value)} style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none' }}>
              {['Website + booking','Web maintenance','CRE marketing','Custom'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Setup fee ($)</label>
              <input type="number" value={form.setup} onChange={e => update('setup', e.target.value)} placeholder="e.g. 500"
                style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Monthly retainer ($)</label>
              <input type="number" value={form.retainer} onChange={e => update('retainer', e.target.value)} placeholder="e.g. 200"
                style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Monthly revisions</label>
            <input type="number" value={form.revisions} onChange={e => update('revisions', e.target.value)}
              style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:8 }}>Initial status</label>
            <div style={{ display:'flex', gap:8 }}>
              {[{v:'active',l:'Active'},{v:'review',l:'In Review'},{v:'pending',l:'Pending'}].map(s => (
                <button key={s.v} type="button" onClick={() => update('status', s.v)}
                  style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${form.status===s.v?'#6C63FF':'#E8EAF0'}`, background:form.status===s.v?'#EEF0FF':'#fff', color:form.status===s.v?'#6C63FF':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize:12, color:'#EF4444', background:'#FEF2F2', padding:'8px 12px', borderRadius:8 }}>{error}</div>}
          <div style={{ paddingTop:8, borderTop:'1px solid #E8EAF0', fontSize:11, color:'#94A3B8' }}>
            💡 After saving, go to Supabase → Authentication → Invite user with the client's email to give them portal access.
          </div>
          <button type="submit" disabled={saving}
            style={{ padding:'12px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 8px 24px rgba(108,99,255,.25)' }}>
            {saving ? 'Saving…' : 'Add client →'}
          </button>
        </form>
      </div>
    </div>
  )
}
