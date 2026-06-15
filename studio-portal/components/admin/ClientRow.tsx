import { Client } from '@/types'
import styles from './ClientRow.module.css'
import clsx from 'clsx'

const PILL: Record<string, string> = { active:'pill-green', review:'pill-amber', pending:'pill-gray' }
const LABEL: Record<string, string> = { active:'Active', review:'In Review', pending:'Pending' }
const AV_COLORS = ['av-g','av-v','av-a','av-b']

function initials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
}

interface Props { client: Client; index?: number }

export default function ClientRow({ client, index = 0 }: Props) {
  return (
    <a href={`/admin/clients/${client.id}`} className={styles.row}>
      <div className={clsx(styles.av, styles[AV_COLORS[index % 4]])}>
        {initials(client.name)}
      </div>
      <div style={{ flex: 1 }}>
        <div className={styles.name}>{client.name}</div>
        <div className={styles.type}>{client.type}</div>
      </div>
      <span className={clsx('pill', PILL[client.status])}>{LABEL[client.status]}</span>
      <div className={styles.right}>
        <div className={styles.amt}>${client.monthly_retainer}<span>/mo</span></div>
        <div className={styles.date}>{client.next_payment ?? 'TBD'}</div>
      </div>
      <svg style={{width:14,height:14,stroke:'var(--muted)',fill:'none',strokeWidth:2,flexShrink:0,marginLeft:8}} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
  )
}
