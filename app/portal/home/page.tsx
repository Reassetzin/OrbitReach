import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'

export default async function PortalHomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to your portal</h1>
      <p style={{ color: '#64748B' }}>Your studio portal is being set up.</p>
    </div>
  )
}
