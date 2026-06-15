'use client'
import { usePathname } from 'next/navigation'

const TABS = [
  { label:'Home',           href:'/portal/home'     },
  { label:'Action items',   href:'/portal/tasks'    },
  { label:'Submit request', href:'/portal/request'  },
  { label:'Messages',       href:'/portal/messages' },
  { label:'Billing',        href:'/portal/billing'  },
]

export default function PortalNav() {
  const pathname = usePathname()
  return (
    <header style={{ background:'#fff', borderBottom:'1px solid #E8EAF0' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 32px', borderBottom:'1px solid #E8EAF0' }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6C63FF,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg viewBox="0 0 24 24" style={{ width:14, height:14 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span style={{ fontSize:14, fontWeight:600, color:'#0D0D1A', flex:1 }}>My Portal</span>
        <a href="/login" style={{ fontSize:11, color:'#94A3B8', textDecoration:'none' }}>Sign out</a>
      </div>
      <nav style={{ display:'flex', padding:'0 32px', overflowX:'auto' as const }}>
        {TABS.map(tab => (
          <a key={tab.href} href={tab.href}
            style={{ fontSize:13, fontWeight:500, padding:'10px 14px', color:pathname===tab.href?'#6C63FF':'#94A3B8', borderBottom:`2px solid ${pathname===tab.href?'#6C63FF':'transparent'}`, textDecoration:'none', whiteSpace:'nowrap' as const, transition:'color .14s' }}>
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
