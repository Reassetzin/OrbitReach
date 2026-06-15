import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  redirect(isAdmin ? '/admin/dashboard' : '/portal/home')
}
