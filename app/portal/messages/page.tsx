'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/supabase/client'

export default function PortalMessagesPage() {
  const [client, setClient] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setClient(c)
        supabase.from('messages').select('*').eq('client_id', c.id).order('created_at')
          .then(({ data }) => { setMessages(data ?? []); setLoading(false) })
        // realtime
        supabase.channel('messages').on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`client_id=eq.${c.id}` },
          payload => setMessages(m => [...m, payload.new as any])
        ).subscribe()
      })
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function send() {
    if (!text.trim() || !client) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({ client_id: client.id, from_admin: false, text: text.trim() })
    setText(''); setSending(false)
  }

  if (loading) return <div style={{padding:48,textAlign:'center',color:'#94A3B8',fontFamily:'Inter,sans-serif'}}>Loading…</div>

  return (
    <div style={{fontFamily:'Inter,sans-serif',display:'flex',flexDirection:'column' as const,height:'calc(100vh - 56px)',maxWidth:700,margin:'0 auto',padding:'0 24px'}}>
      <div style={{padding:'20px 0 12px',fontSize:18,fontWeight:700,color:'#0D0D1A',borderBottom:'1px solid #E8EAF0',flexShrink:0}}>
        Messages with your studio
      </div>
      <div style={{flex:1,overflowY:'auto' as const,padding:'16px 0',display:'flex',flexDirection:'column' as const,gap:10}}>
        {messages.length===0&&<div style={{textAlign:'center',padding:48,color:'#94A3B8',fontSize:13}}>No messages yet. Send your studio a message!</div>}
        {messages.map(m=>(
          <div key={m.id} style={{display:'flex',justifyContent:m.from_admin?'flex-start':'flex-end'}}>
            <div style={{maxWidth:'75%',padding:'10px 14px',borderRadius:m.from_admin?'4px 14px 14px 14px':'14px 4px 14px 14px',background:m.from_admin?'#fff':'linear-gradient(135deg,#6C63FF,#A855F7)',border:m.from_admin?'1px solid #E8EAF0':'none',boxShadow:m.from_admin?'none':'0 4px 12px rgba(108,99,255,.25)'}}>
              <div style={{fontSize:11,fontWeight:600,marginBottom:4,color:m.from_admin?'#6C63FF':'rgba(255,255,255,.8)'}}>{m.from_admin?'Studio':'You'}</div>
              <div style={{fontSize:13,color:m.from_admin?'#0D0D1A':'#fff',lineHeight:1.5}}>{m.text}</div>
              <div style={{fontSize:10,marginTop:4,color:m.from_admin?'#94A3B8':'rgba(255,255,255,.6)'}}>{new Date(m.created_at).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:'12px 0 16px',borderTop:'1px solid #E8EAF0',display:'flex',gap:10,flexShrink:0}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Write a message to your studio…"
          style={{flex:1,fontSize:13,padding:'10px 14px',border:'1.5px solid #E8EAF0',borderRadius:10,background:'#F5F6FA',outline:'none'}}/>
        <button onClick={send} disabled={sending||!text.trim()} style={{padding:'10px 20px',background:'linear-gradient(135deg,#6C63FF,#A855F7)',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 4px 12px rgba(108,99,255,.25)'}}>
          {sending?'…':'Send'}
        </button>
      </div>
    </div>
  )
}
