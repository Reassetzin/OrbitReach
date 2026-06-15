'use client'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import styles from './PortalNav.module.css'

const TABS = [
  { label: 'Home',           href: '/portal/home'     },
  { label: 'Action items',   href: '/portal/tasks'    },
  { label: 'Submit request', href: '/portal/request'  },
  { label: 'Messages',       href: '/portal/messages' },
  { label: 'Billing',        href: '/portal/billing'  },
]

interface Props { clientName: string }

export default function PortalNav({ clientName }: Props) {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span className={styles.clientName}>{clientName}</span>
        <span className={styles.badge}>My Portal</span>
      </div>
      <nav className={styles.tabs}>
        {TABS.map(tab => (
          <a key={tab.href} href={tab.href} className={clsx(styles.tab, pathname === tab.href && styles.active)}>
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
