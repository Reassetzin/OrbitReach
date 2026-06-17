'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'

type ScopeItem = { title: string; description: string; price: number }
type Proposal  = { id: string; prospect_name: string; prospect_email: string; project_name: string; scope: ScopeItem[]; timeline: string; total: number; status: string; notes: string; created_at: string }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:    { bg: '#F1F5F9', color: '#64748B' },
  sent:     { bg: '#EEF0FF', color: '#6C63FF' },
  accepted: { bg: '#ECFDF5', color: '#10B981' },
  declined: { bg: '#FEF2F2', color: '#EF4444' },
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [preview,   setPreview]   = useState<Proposal | null>(null)
  const [generatingScope, setGeneratingScope] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  /* form */
  const [prospectName,  setProspectName]  = useState('')
  const [prospectEmail, setProspectEmail] = useState('')
  const [projectName,   setProjectName]   = useState('')
  const [timeline,      setTimeline]      = useState('')
  const [notes,         setNotes]         = useState('')
  const [scope, setScope] = useState<ScopeItem[]>([{ title: '', description: '', price: 0 }])

  useEffect(() => {
    createClient().from('proposals').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setProposals(data ?? [])
      setLoading(false)
    })
  }, [])

  const total = scope.reduce((s, i) => s + i.price, 0)

  function addScope() { setScope(s => [...s, { title: '', description: '', price: 0 }]) }
  function removeScope(idx: number) { setScope(s => s.filter((_, i) => i !== idx)) }
  function updateScope(idx: number, field: keyof ScopeItem, val: string | number) {
    setScope(s => s.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  async function saveProposal(status: 'draft' | 'sent') {
    if (!prospectName || !projectName) return alert('Fill in prospect name and project name')
    setSaving(true)
    const { data } = await createClient().from('proposals').insert({
      prospect_name: prospectName, prospect_email: prospectEmail,
      project_name: projectName, scope, timeline, total, status, notes
    }).select().single()
    if (data) setProposals(p => [data, ...p])
    setCreating(false)
    setProspectName(''); setProspectEmail(''); setProjectName('')
    setTimeline(''); setNotes(''); setScope([{ title: '', description: '', price: 0 }])
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await createClient().from('proposals').update({ status }).eq('id', id)
    setProposals(p => p.map(x => x.id === id ? { ...x, status } : x))
  }

  async function deleteProposal(id: string, name: string) {
    if (!confirm(`Delete proposal for ${name}? This cannot be undone.`)) return
    await createClient().from('proposals').delete().eq('id', id)
    setProposals(p => p.filter(x => x.id !== id))
  }

  async function generateScope() {
    if (!aiPrompt.trim()) return
    setGeneratingScope(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a web design agency. Generate a scope of work for this project: "${aiPrompt}"\n\nReturn ONLY a JSON array, no markdown, no explanation. Each item must have: title (string), description (string, 1-2 sentences), price (number in USD, realistic for a web agency).\n\nExample format: [{"title":"Website Design","description":"Custom design for up to 5 pages.","price":1500}]\n\nGenerate 3-5 deliverables appropriate for the project.`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed: ScopeItem[] = JSON.parse(cleaned)
      setScope(parsed)
    } catch (e) {
      alert('Failed to generate scope. Try again or add items manually.')
    }
    setGeneratingScope(false)
  }

  function printProposal() {
    const content = printRef.current?.innerHTML
    if (!content) return
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><title>Proposal</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 48px; color: #0D0D1A; max-width: 820px; margin: 0 auto; }
        h1 { font-size: 32px; font-weight: 800; letter-spacing: -.02em; }
        .scope-item { padding: 20px; border: 1px solid #E8EAF0; border-radius: 12px; margin-bottom: 12px; }
        .price { font-size: 18px; font-weight: 800; color: #6C63FF; }
        .total-box { background: linear-gradient(135deg,#6C63FF,#A855F7); color: white; border-radius: 12px; padding: 20px 28px; text-align: right; }
        @media print { body { padding: 24px; } }
      </style></head><body>${content}</body></html>`)
    w.document.close()
    w.print()
  }

  const S = {
    page:  { fontFamily: 'Inter, sans-serif', background: '#F5F6FA', minHeight: '100vh', padding: '28px' } as any,
    card:  { background: '#fff', borderRadius: 16, border: '1px solid #E8EAF0', overflow: 'hidden' } as any,
    head:  { padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as any,
    label: { fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as any, letterSpacing: '.05em', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '11px 13px', border: '1.5px solid #E8EAF0', borderRadius: 10, fontSize: 14, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' as any },
  }

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <a href="/admin/dashboard" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none', marginBottom: 6, display: 'block' }}>← Dashboard</a>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-.02em' }}>Proposals</div>
          </div>
          <button onClick={() => setCreating(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + New proposal
          </button>
        </div>

        {creating && (
          <div style={S.card}>
            <div style={S.head}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New proposal</div>
              <button onClick={() => setCreating(false)} style={{ fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Cancel</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Prospect name</label>
                  <input value={prospectName} onChange={e => setProspectName(e.target.value)} placeholder="Jane Smith / Acme Co." style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Prospect email</label>
                  <input type="email" value={prospectEmail} onChange={e => setProspectEmail(e.target.value)} placeholder="jane@acme.com" style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Project name</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Acme Website Redesign" style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Timeline</label>
                  <input value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g. 3–4 weeks" style={S.input} />
                </div>
              </div>

              {/* AI scope generator */}
              <div>
                <label style={S.label}>Scope of work</label>
                <div style={{ background: 'linear-gradient(135deg,rgba(108,99,255,.06),rgba(168,85,247,.04))', border: '1.5px solid rgba(108,99,255,.15)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', marginBottom: 8 }}>✨ Generate with AI</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && generateScope()}
                      placeholder="e.g. 5-page website for a pet dental clinic with booking and Stripe payments"
                      style={{ ...S.input, flex: 1, fontSize: 13 }}
                    />
                    <button onClick={generateScope} disabled={generatingScope || !aiPrompt.trim()}
                      style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (generatingScope || !aiPrompt.trim()) ? 0.6 : 1 }}>
                      {generatingScope ? '⏳ Generating…' : '✨ Generate'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Describe the project and AI will suggest deliverables with pricing. You can edit after.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {scope.map((item, idx) => (
                    <div key={idx} style={{ border: '1.5px solid #E8EAF0', borderRadius: 12, padding: 16, background: '#F8FAFC' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 10, marginBottom: 8 }}>
                        <input value={item.title} onChange={e => updateScope(idx, 'title', e.target.value)} placeholder="Deliverable title"
                          style={{ ...S.input, fontWeight: 600 }} />
                        <input type="number" value={item.price} onChange={e => updateScope(idx, 'price', +e.target.value)} placeholder="Price"
                          style={S.input} />
                        <button onClick={() => removeScope(idx)} style={{ fontSize: 16, color: '#CBD5E1', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                      <textarea value={item.description} onChange={e => updateScope(idx, 'description', e.target.value)} rows={2}
                        placeholder="What's included in this deliverable…"
                        style={{ ...S.input, resize: 'none' as any }} />
                    </div>
                  ))}
                  <button onClick={addScope} style={{ padding: '10px', border: '1.5px dashed #E8EAF0', borderRadius: 10, fontSize: 13, color: '#6C63FF', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
                    + Add deliverable
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Total: <span style={{ color: '#6C63FF' }}>${total.toLocaleString()}</span></div>
              </div>

              <div>
                <label style={S.label}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Payment terms, what's not included, next steps…"
                  style={{ ...S.input, resize: 'none' as any }} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => saveProposal('draft')} disabled={saving}
                  style={{ padding: '11px 22px', background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E8EAF0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Save draft
                </button>
                <button onClick={() => saveProposal('sent')} disabled={saving}
                  style={{ padding: '11px 22px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Create & mark sent →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div style={S.card}>
          <div style={S.head}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>All proposals</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>{proposals.length} total</div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
          ) : proposals.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No proposals yet</div>
              <div style={{ fontSize: 14, color: '#94A3B8' }}>Create your first proposal above.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Prospect', 'Project', 'Value', 'Timeline', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94A3B8', padding: '10px 22px', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => {
                  const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.prospect_name}</div>
                        {p.prospect_email && <div style={{ fontSize: 12, color: '#94A3B8' }}>{p.prospect_email}</div>}
                      </td>
                      <td style={{ padding: '14px 22px', fontSize: 14 }}>{p.project_name}</td>
                      <td style={{ padding: '14px 22px', fontSize: 15, fontWeight: 800, color: '#6C63FF' }}>${p.total.toLocaleString()}</td>
                      <td style={{ padding: '14px 22px', fontSize: 13, color: '#64748B' }}>{p.timeline || '—'}</td>
                      <td style={{ padding: '14px 22px' }}>
                        <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                          style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.color, border: 'none', cursor: 'pointer' }}>
                          {['draft','sent','accepted','declined'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setPreview(p)} style={{ fontSize: 12, fontWeight: 600, color: '#6C63FF', background: '#EEF0FF', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>
                            View / Print
                          </button>
                          <button onClick={() => deleteProposal(p.id, p.prospect_name)} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Print preview modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setPreview(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Proposal preview</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={printProposal} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  🖨 Print / Save PDF
                </button>
                <button onClick={() => setPreview(null)} style={{ padding: '8px 16px', background: '#F5F6FA', border: '1px solid #E8EAF0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            <div ref={printRef} style={{ padding: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-.02em' }}>OrbitReach</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>Web Design Studio · Project Proposal</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>{new Date(preview.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  {preview.timeline && <div style={{ fontSize: 13, color: '#6C63FF', fontWeight: 600, marginTop: 4 }}>Timeline: {preview.timeline}</div>}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 6 }}>Prepared for</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{preview.prospect_name}</div>
                {preview.prospect_email && <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{preview.prospect_email}</div>}
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{preview.project_name}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {preview.scope.map((item: ScopeItem, i: number) => (
                  <div key={i} style={{ border: '1px solid #E8EAF0', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: item.description ? 6 : 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#6C63FF' }}>${item.price.toLocaleString()}</div>
                    </div>
                    {item.description && <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{item.description}</div>}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                <div style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)', borderRadius: 12, padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 4 }}>TOTAL INVESTMENT</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>${preview.total.toLocaleString()}</div>
                </div>
              </div>

              {preview.notes && (
                <div style={{ borderTop: '1px solid #E8EAF0', paddingTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 8 }}>Notes & terms</div>
                  <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{preview.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
