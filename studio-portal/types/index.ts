export type ClientStatus = 'active' | 'review' | 'pending'
export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done'
export type RequestStatus = 'pending' | 'accepted' | 'backlog' | 'declined'
export type ClientTaskType = 'file' | 'text' | 'review'

export interface Client {
  id: string
  name: string
  type: string
  location: string | null
  contact: string
  email: string
  setup_fee: number
  monthly_retainer: number
  status: ClientStatus
  next_payment: string | null
  monthly_revisions: number
  revisions_used: number
  progress_step: number
  user_id: string // Supabase auth user id for this client
  created_at: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  done: boolean
  status: TaskStatus
  meta: string | null
  created_at: string
}

// Tasks assigned TO the client (things they need to do)
export interface ClientTask {
  id: string
  client_id: string
  emoji: string
  title: string
  description: string
  type: ClientTaskType
  done: boolean
  response: string | null
  file_url: string | null
  created_at: string
}

export interface Request {
  id: string
  client_id: string
  title: string
  description: string | null
  link: string | null
  file_url: string | null
  status: RequestStatus
  created_at: string
}

export interface Message {
  id: string
  client_id: string
  from_admin: boolean
  text: string
  created_at: string
}

export interface ProgressStep {
  id: string
  label: string
  sub: string
  icon: string
}

export const PROGRESS_STEPS: ProgressStep[] = [
  { id: 'submitted',   label: 'Submitted',   sub: 'Request received',    icon: '📥' },
  { id: 'inprogress',  label: 'In Progress', sub: "We're building it",   icon: '⚙️' },
  { id: 'review',      label: 'Your Review', sub: 'Action needed',       icon: '👀' },
  { id: 'completed',   label: 'Completed',   sub: 'Live on your site',   icon: '✅' },
]

export const STATUS_META: Record<ClientStatus, { pill: string; label: string }> = {
  active:  { pill: 'pill-green',  label: 'Active'    },
  review:  { pill: 'pill-amber',  label: 'In Review' },
  pending: { pill: 'pill-gray',   label: 'Pending'   },
}
