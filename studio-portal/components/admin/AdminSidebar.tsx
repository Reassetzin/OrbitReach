'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/supabase/client'
import styles from './AdminSidebar.module.css'
import clsx from 'clsx'

const NAV = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
  { label: 'Clients',   href: '/admin/clients',   icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8m4 14v-2a4 4 0 0 0-3-3.87' },
  { label: 'Tasks',     href: '/admin/tasks',     icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Revenue',   href: '/admin/revenue',   icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { label: 'Requests',  href: '/admin/requests',  icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={styles.sb}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <div className={styles.brandName}>Studio</div>
          <div className={styles.brandSub}>Client workspace</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>Main</div>
        {NAV.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={clsx(styles.navItem, pathname.startsWith(item.href) && styles.active)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon}/>
            </svg>
            {item.label}
          </a>
        ))}
        <div className={styles.navSection} style={{ marginTop: 8 }}>Client</div>
        <a href="/portal/home" className={styles.navItem} target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Portal preview
        </a>
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.userAv}>JG</div>
          <div>
            <div className={styles.userName}>JG Studio</div>
            <div className={styles.userRole}>Cape Coral, FL</div>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutBtn}>Sign out</button>
      </div>
    </aside>
  )
}
