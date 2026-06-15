import { createClient } from '@/supabase/server'
import { redirect } from 'next/navigation'
import PortalHomeClient from './PortalHomeClient'
import { PROGRESS_STEPS } from '@/types'

export default async function PortalHomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients').select('*').eq('user_id', user.id).single()
  if (!client) redirect('/login')

  const { data: clientTasks } = await supabase
    .from('client_tasks').select('*').eq('client_id', client.id).order('created_at')

  const { data: messages } = await supabase
    .from('messages').select('*').eq('client_id', client.id)
    .order('created_at', { ascending: false }).limit(3)

  return (
    <PortalHomeClient
      client={client}
      clientTasks={clientTasks ?? []}
      recentMessages={(messages ?? []).reverse()}
      progressSteps={PROGRESS_STEPS}
    />
  )
}
