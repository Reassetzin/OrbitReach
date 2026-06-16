'use client'
import { useState } from 'react'
import { createClient } from '@/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStatus('Signing in…')

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        setStatus('')
        return
      }

      setStatus('Checking account…')
      const user = data.user

      // Check if this user is an admin
      const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

      if (isAdmin) {
        setStatus('Welcome back! Loading dashboard…')
        window.location.href = '/admin/dashboard'
        return
      }

      // Check if this user has a client record
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (client) {
        setStatus('Welcome! Loading your portal…')
        window.location.href = '/portal/home'
      } else {
        setStatus('Welcome! Loading dashboard…')
        window.location.href = '/admin/dashboard'
      }

    } catch (err: any) {
      setError('Connection failed: ' + err.message)
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F6FA', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400, boxShadow:'0 4px 12px rgba(0,0,0,.08)' }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#6C63FF,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <svg viewBox="0 0 24 24" style={{ width:22, height:22 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h1 style={{ fontSize:22, fontWeight:700, textAlign:'center', marginBottom:6, color:'#0D0D1A' }}>Studio Portal</h1>
        <p style={{ fontSize:13, color:'#94A3B8', textAlign:'center', marginBottom:28 }}>Sign in to your account</p>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', color:'#64748B', display:'block', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:'100%', fontSize:13, padding:'10px 14px', border:'1.5px solid #E8EAF0', borderRadius:8, background:'#F5F6FA', outline:'none', boxSizing:'border-box' as const }}/>
          </div>
          {error && <div style={{ fontSize:12, color:'#EF4444', background:'#FEF2F2', padding:'8px 12px', borderRadius:8 }}>{error}</div>}
          {status && <div style={{ fontSize:12, color:'#10B981', background:'#ECFDF5', padding:'8px 12px', borderRadius:8 }}>{status}</div>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'10px', fontSize:13, fontWeight:600, background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', marginTop:4 }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div style={{ marginTop:16, fontSize:11, color:'#94A3B8', textAlign:'center' }}>
          v1.2.2 · {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,30)}...
        </div>
      </div>
    </div>
  )
}
