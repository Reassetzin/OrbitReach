import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import styles from './admin.module.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect('/login')
  }

  return (
    <div className={styles.app}>
      <AdminSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
