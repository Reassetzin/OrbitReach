'use client'
import { Client, ClientTask, Message, ProgressStep } from '@/types'
import styles from './home.module.css'

interface Props {
  client: Client
  clientTasks: ClientTask[]
  recentMessages: Message[]
  progressSteps: ProgressStep[]
}

export default function PortalHomeClient({ client, clientTasks, recentMessages, progressSteps }: Props) {
  const doneTasks = clientTasks.filter(t => t.done).length
  const left = (client.monthly_revisions ?? 5) - (client.revisions_used ?? 0)

  return (
    <div className={styles.body}>
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.bannerType}>{client.type}</div>
          <div className={styles.bannerName}>{client.name}</div>
          <div className={styles.bannerSub}>Active plan · ${client.monthly_retainer}/month</div>
          <div className={styles.bannerStats}>
            <div className={styles.stat}><div className={styles.statVal}>{doneTasks}/{clientTasks.length}</div><div className={styles.statLbl}>Tasks done</div></div>
            <div className={styles.stat}><div className={styles.statVal}>{left} left</div><div className={styles.statLbl}>Requests this month</div></div>
            <div className={styles.stat}><div className={styles.statVal}>{client.next_payment ?? 'TBD'}</div><div className={styles.statLbl}>Next payment</div></div>
          </div>
        </div>
      </div>

      <div className={styles.steps}>
        <div className={styles.stepsHead}>Website progress</div>
        <div className={styles.stepsRow}>
          {progressSteps.map((step, i) => {
            const isDone = i < (client.progress_step ?? 1)
            const isActive = i === (client.progress_step ?? 1)
            return (
              <div key={step.id} className={styles.step}>
                <div className={`${styles.dot} ${isDone ? styles.dotDone : isActive ? styles.dotActive : ''}`}>
                  {isDone ? '✓' : step.icon}
                </div>
                <div className={styles.stepLabel} style={{ color: isDone ? 'var(--green)' : isActive ? 'var(--violet)' : 'var(--muted)' }}>{step.label}</div>
                <div className={styles.stepSub}>{step.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid-2" style={{ padding: '0 24px 40px' }}>
        <div className="card card-lg">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:14, fontWeight:600 }}>Action needed from you</span>
            <a href="/portal/tasks" style={{ fontSize:12, color:'var(--violet)' }}>See all →</a>
          </div>
          {clientTasks.filter(t => !t.done).slice(0, 3).map(t => (
            <a key={t.id} href="/portal/tasks" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 8px', borderBottom:'1px solid var(--border)', textDecoration:'none', color:'inherit' }}>
              <span style={{ fontSize:20 }}>{t.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{t.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{t.description?.substring(0, 60)}…</div>
              </div>
              <svg style={{ width:14, height:14, stroke:'var(--muted)', fill:'none', strokeWidth:2 }} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          ))}
          {clientTasks.filter(t => !t.done).length === 0 && (
            <p style={{ fontSize:13, color:'var(--muted)', padding:'12px 0' }}>No action needed right now 🎉</p>
          )}
        </div>

        <div className="card card-lg">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:14, fontWeight:600 }}>Recent messages</span>
            <a href="/portal/messages" style={{ fontSize:12, color:'var(--violet)' }}>See all →</a>
          </div>
          {recentMessages.map(m => (
            <div key={m.id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--ink)' }}>{m.from_admin ? 'Studio' : 'You'}</span>
                <span style={{ fontSize:11, color:'var(--muted)' }}>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--mid)' }}>{m.text}</div>
            </div>
          ))}
          {recentMessages.length === 0 && (
            <p style={{ fontSize:13, color:'var(--muted)' }}>No messages yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
