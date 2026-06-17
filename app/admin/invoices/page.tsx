'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'

type LineItem = { description: string; qty: number; rate: number }
type Invoice  = { id: string; number: string; status: string; due_date: string; items: LineItem[]; total: number; notes: string; created_at: string; clients: { name: string; email: string } }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:   { bg: '#F1F5F9', color: '#64748B' },
  sent:    { bg: '#EEF0FF', color: '#6C63FF' },
  paid:    { bg: '#ECFDF5', color: '#10B981' },
  overdue: { bg: '#FEF2F2', color: '#EF4444' },
}

export default function InvoicesPage() {
  const [clients,  setClients]  = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [preview,  setPreview]  = useState<Invoice | null>(null)

  /* form state */
  const [clientId,  setClientId]  = useState('')
  const [dueDate,   setDueDate]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [items,     setItems]     = useState<LineItem[]>([{ description: '', qty: 1, rate: 0 }])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('clients').select('id, name, email').order('name'),
      sb.from('invoices').select('*, clients(name, email)').order('created_at', { ascending: false }),
    ]).then(([c, i]) => {
      setClients(c.data ?? [])
      setInvoices(i.data ?? [])
      setLoading(false)
    })
  }, [])

  const total = items.reduce((s, i) => s + i.qty * i.rate, 0)

  function addItem() { setItems(it => [...it, { description: '', qty: 1, rate: 0 }]) }
  function removeItem(idx: number) { setItems(it => it.filter((_, i) => i !== idx)) }
  function updateItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(it => it.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  async function saveInvoice(status: 'draft' | 'sent') {
    if (!clientId) return alert('Select a client')
    if (items.some(i => !i.description)) return alert('Fill in all line item descriptions')
    setSaving(true)
    const sb = createClient()
    const num = `INV-${Date.now().toString().slice(-6)}`
    const { data } = await sb.from('invoices').insert({
      client_id: clientId, number: num, status, due_date: dueDate,
      items, total, notes
    }).select('*, clients(name, email)').single()
    if (data) setInvoices(inv => [data, ...inv])
    setCreating(false)
    setItems([{ description: '', qty: 1, rate: 0 }])
    setClientId(''); setDueDate(''); setNotes('')
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await createClient().from('invoices').update({ status }).eq('id', id)
    setInvoices(inv => inv.map(i => i.id === id ? { ...i, status } : i))
  }

  function printInvoice() {
    const content = printRef.current?.innerHTML
    if (!content) return
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 48px; color: #0D0D1A; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 32px; font-weight: 800; letter-spacing: -.02em; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #94A3B8; padding: 8px 0; border-bottom: 1px solid #E8EAF0; }
        td { padding: 12px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
        .total { font-size: 24px; font-weight: 800; color: #6C63FF; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #ECFDF5; color: #10B981; }
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <a href="/admin/dashboard" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>← Dashboard</a>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-.02em' }}>Invoices</div>
          </div>
          <button onClick={() => setCreating(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + New invoice
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={S.card}>
            <div style={S.head}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New invoice</div>
              <button onClick={() => setCreating(false)} style={{ fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Cancel</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Client</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ ...S.input }}>
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Due date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={S.input} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <label style={S.label}>Line items</label>
                <div style={{ border: '1.5px solid #E8EAF0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 40px', gap: 0, background: '#F8FAFC', padding: '10px 14px', borderBottom: '1px solid #E8EAF0' }}>
                    {['Description', 'Qty', 'Rate', ''].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>)}
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 40px', gap: 0, padding: '10px 14px', borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center' }}>
                      <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description…"
                        style={{ fontSize: 14, padding: '8px 0', border: 'none', background: 'transparent', outline: 'none', width: '100%', paddingRight: 12 }} />
                      <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} min={1}
                        style={{ fontSize: 14, padding: '8px 0', border: 'none', background: 'transparent', outline: 'none', width: '100%', paddingRight: 8 }} />
                      <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', +e.target.value)} min={0}
                        style={{ fontSize: 14, padding: '8px 0', border: 'none', background: 'transparent', outline: 'none', width: '100%' }} />
                      <button onClick={() => removeItem(idx)} style={{ fontSize: 16, color: '#CBD5E1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid #E8EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={addItem} style={{ fontSize: 13, color: '#6C63FF', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>+ Add line item</button>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0D0D1A' }}>Total: <span style={{ color: '#6C63FF' }}>${total.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <label style={S.label}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment terms, bank details, thank you note…"
                  style={{ ...S.input, resize: 'none' as any }} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => saveInvoice('draft')} disabled={saving}
                  style={{ padding: '11px 22px', background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E8EAF0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Save draft
                </button>
                <button onClick={() => saveInvoice('sent')} disabled={saving}
                  style={{ padding: '11px 22px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Create & mark sent →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice list */}
        <div style={S.card}>
          <div style={S.head}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>All invoices</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>{invoices.length} total</div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No invoices yet</div>
              <div style={{ fontSize: 14, color: '#94A3B8' }}>Create your first invoice above.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Invoice #', 'Client', 'Amount', 'Due', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94A3B8', padding: '10px 22px', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 22px', fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{inv.number}</td>
                      <td style={{ padding: '14px 22px', fontSize: 14, color: '#0D0D1A' }}>{inv.clients?.name}</td>
                      <td style={{ padding: '14px 22px', fontSize: 15, fontWeight: 800, color: '#6C63FF' }}>${inv.total.toLocaleString()}</td>
                      <td style={{ padding: '14px 22px', fontSize: 13, color: '#64748B' }}>{inv.due_date || '—'}</td>
                      <td style={{ padding: '14px 22px' }}>
                        <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                          style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.color, border: 'none', cursor: 'pointer' }}>
                          {['draft','sent','paid','overdue'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '14px 22px' }}>
                        <button onClick={() => setPreview(inv)} style={{ fontSize: 12, fontWeight: 600, color: '#6C63FF', background: '#EEF0FF', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>
                          View / Print
                        </button>
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
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Invoice preview</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={printInvoice} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#6C63FF,#A855F7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  🖨 Print / Save PDF
                </button>
                <button onClick={() => setPreview(null)} style={{ padding: '8px 16px', background: '#F5F6FA', border: '1px solid #E8EAF0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            <div ref={printRef} style={{ padding: 40 }}>
              {/* Invoice header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-.02em' }}>OrbitReach</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Web Design Studio</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#6C63FF' }}>{preview.number}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                    Issued: {new Date(preview.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  {preview.due_date && <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>Due: {preview.due_date}</div>}
                </div>
              </div>

              {/* Bill to */}
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 6 }}>Bill to</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A' }}>{preview.clients?.name}</div>
                {preview.clients?.email && <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{preview.clients.email}</div>}
              </div>

              {/* Line items table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Description', 'Qty', 'Rate', 'Amount'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Description' ? 'left' : 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94A3B8', padding: '10px 12px', borderBottom: '1px solid #E8EAF0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item: LineItem, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontSize: 14, color: '#0D0D1A' }}>{item.description}</td>
                      <td style={{ padding: '12px', fontSize: 14, textAlign: 'right', color: '#64748B' }}>{item.qty}</td>
                      <td style={{ padding: '12px', fontSize: 14, textAlign: 'right', color: '#64748B' }}>${item.rate.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 14, textAlign: 'right', fontWeight: 600, color: '#0D0D1A' }}>${(item.qty * item.rate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                <div style={{ background: 'linear-gradient(135deg,#6C63FF,#A855F7)', borderRadius: 12, padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 4 }}>TOTAL DUE</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>${preview.total.toLocaleString()}</div>
                </div>
              </div>

              {/* Notes */}
              {preview.notes && (
                <div style={{ borderTop: '1px solid #E8EAF0', paddingTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94A3B8', marginBottom: 8 }}>Notes</div>
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
