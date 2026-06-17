'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

export default function PortalNav() {
  const [clientName, setClientName] = useState<string>('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('clients').select('name').eq('user_id', user.id).single().then(({ data }) => {
        if (data?.name) setClientName(data.name)
      })
    })
  }, [])

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = clientName
    ? clientName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '…'

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #E8EAF0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
        {/* Logo */}
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6C63FF,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>

        {/* Brand */}
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', letterSpacing: '-.01em' }}>
          Orbit<span style={{ color: '#6C63FF' }}>Reach</span>
        </span>

        <div style={{ flex: 1 }} />

        {/* Welcome */}
        {clientName && (
          <span style={{ fontSize: 13, color: '#64748B', display: 'none' }} className="nav-welcome">
            {clientName.split(' ')[0]}
          </span>
        )}

        {/* Avatar + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6C63FF,#A855F7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(108,99,255,.3)'
          }}>
            {initials}
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              background: '#F5F6FA', border: '1px solid #E8EAF0',
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: signingOut ? 0.6 : 1
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  )
}
