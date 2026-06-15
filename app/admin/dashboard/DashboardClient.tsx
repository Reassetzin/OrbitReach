'use client'
import { Client, Request } from '@/types'
import PageHeader from '@/components/admin/PageHeader'
import HeroCard from '@/components/admin/HeroCard'
import ClientRow from '@/components/admin/ClientRow'
import RequestItem from '@/components/admin/RequestItem'
import styles from './dashboard.module.css'

interface Props {
  clients: Client[]
  openTasks: number
  pendingRequests: number
  requests: (Request & { clients: { name: string } })[]
}

export default function DashboardClient({ clients, openTasks, pendingRequests, requests }: Props) {
  const mrr = clients.reduce((s, c) => s + c.monthly_retainer, 0)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Here's what needs attention today." action={{ label: '+ Add client', href: '/admin/clients/new' }} />
      <div className={styles.body}>
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <HeroCard label="Monthly Recurring" value={`$${mrr}`} trend="↑ +$150 this month" color="violet" href="/admin/revenue" />
          <HeroCard label="Active Clients" value={String(clients.length)} sub="All on monthly retainer" color="coral" href="/admin/clients" />
          <HeroCard label="Open Tasks" value={String(openTasks)} sub="Across all clients" color="ocean" href="/admin/tasks" />
          <HeroCard label="New Requests" value={String(pendingRequests)} sub="Awaiting your action" color="forest" href="/admin/requests" />
        </div>

        <div className="grid-2l">
          <div className="card card-lg">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Clients</span>
              <a href="/admin/clients" className={styles.cardLink}>See all →</a>
            </div>
            {clients.slice(0, 4).map(c => <ClientRow key={c.id} client={c} />)}
            {clients.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>
                No clients yet. <a href="/admin/clients/new" style={{ color: 'var(--violet)' }}>Add your first →</a>
              </p>
            )}
          </div>

          <div className="col">
            <div className="card card-p">
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>Upcoming Payments</span>
              </div>
              {clients.map(c => (
                <div key={c.id} className={styles.payRow}>
                  <div>
                    <div className={styles.payName}>{c.name}</div>
                    <div className={styles.payDate}>{c.next_payment ?? 'TBD'}</div>
                  </div>
                  <div className={styles.payAmt}>${c.monthly_retainer}</div>
                </div>
              ))}
              {clients.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No payments yet.</p>}
            </div>

            <div className="card card-p">
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>New Requests</span>
                <a href="/admin/requests" className={styles.cardLink}>See all →</a>
              </div>
              {requests.map(r => (
                <RequestItem key={r.id} request={r} clientName={(r as any).clients?.name} compact />
              ))}
              {requests.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No requests yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
