'use client'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import styles from './PortalMobileNav.module.css'

const TABS = [
  { label: 'Home',    href: '/portal/home',     icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { label: 'Actions', href: '/portal/tasks',    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Request', href: '/portal/request',  icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v8 M8 12h8' },
  { label: 'Messages',href: '/portal/messages', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { label: 'Billing', href: '/portal/billing',  icon: 'M1 4h22a0 0 0 0 1 0 0v16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4z M1 10h22' },
]

export default function PortalMobileNav() {
  const pathname = usePathname()
  return (
    <nav className={styles.nav}>
      {TABS.map(tab => (
        <a key={tab.href} href={tab.href} className={clsx(styles.item, pathname === tab.href && styles.active)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={tab.icon}/>
          </svg>
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  )
}
