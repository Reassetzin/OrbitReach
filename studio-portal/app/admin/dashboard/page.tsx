import { createClient } from '@/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch open tasks count
  const { count: openTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('done', false)

  // Fetch pending requests count
  const { count: pendingRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Fetch recent requests
  const { data: requests } = await supabase
    .from('requests')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <DashboardClient
      clients={clients ?? []}
      openTasks={openTasks ?? 0}
      pendingRequests={pendingRequests ?? 0}
      requests={requests ?? []}
    />
  )
}
