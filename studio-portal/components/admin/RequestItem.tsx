import { Request } from '@/types'
import styles from './RequestItem.module.css'

interface Props {
  request: Request & { clients?: { name: string } }
  clientName?: string
  compact?: boolean
}

const STATUS_PILL: Record<string, string> = { pending:'pill-amber', accepted:'pill-green', backlog:'pill-violet', declined:'pill-red' }
const STATUS_LABEL: Record<string, string> = { pending:'Pending', accepted:'Accepted', backlog:'In backlog', declined:'Declined' }

export default function RequestItem({ request, clientName, compact }: Props) {
  return (
    <div className={styles.item}>
      <div className={styles.icon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.8" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div className={styles.title}>{request.title}</div>
        <div className={styles.sub}>
          {clientName ?? request.clients?.name} · {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>
      <span className={`pill ${STATUS_PILL[request.status] ?? 'pill-gray'}`}>
        {STATUS_LABEL[request.status] ?? request.status}
      </span>
    </div>
  )
}
