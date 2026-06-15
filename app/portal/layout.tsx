import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import PortalNav from '@/components/portal/PortalNav'
import PortalMobileNav from '@/components/portal/PortalMobileNav'
import styles from './portal.module.css'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get the client record linked to this user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    // Logged in but no client record — show waiting screen
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24 }}>
        <div>
          <div style={{ fontSize:32, marginBottom:16 }}>⏳</div>
          <h1 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Your portal is being set up</h1>
          <p style={{ fontSize:13, color:'var(--muted)' }}>Your studio will have it ready shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <PortalNav clientName={client.name} />
      <main className={styles.main}>{children}</main>
      <PortalMobileNav />
    </div>
  )
}
