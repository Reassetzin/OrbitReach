'use client'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Clients',   href: '/admin/clients'   },
  { label: 'Tasks',     href: '/admin/tasks'     },
  { label: 'Revenue',   href: '/admin/revenue'   },
  { label: 'Requests',  href: '/admin/requests'  },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <div style={{ width:232, background:'#0F0F14', display:'flex', flexDirection:'column', flexShrink:0, height:'100vh', position:'sticky', top:0 }}>
      <div style={{ padding:'24px 20px', borderBottom:'1px solid #1E1E2E', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:12, background:'linear-gradient(135deg,#6C63FF,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(108,99,255,.25)' }}>
          <svg viewBox="0 0 24 24" style={{ width:18, height:18 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-.02em' }}>Studio</div>
          <div style={{ fontSize:11, color:'#6B6B8A', marginTop:2 }}>Client workspace</div>
        </div>
      </div>
      <nav style={{ flex:1, padding:12, overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B6B8A', padding:'12px 8px 4px' }}>Main</div>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <a key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, marginBottom:2, textDecoration:'none', fontSize:12, color: active ? '#fff' : '#6B6B8A', background: active ? '#22223A' : 'transparent', fontWeight: active ? 500 : 400, position:'relative', transition:'all .14s' }}>
              {active && <div style={{ position:'absolute', left:0, top:6, bottom:6, width:3, background:'#6C63FF', borderRadius:'0 3px 3px 0' }}/>}
              {item.label}
            </a>
          )
        })}
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B6B8A', padding:'12px 8px 4px', marginTop:8 }}>Client</div>
        <a href="/portal/home" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, marginBottom:2, textDecoration:'none', fontSize:12, color:'#6B6B8A' }}>Portal preview</a>
      </nav>
      <div style={{ padding:12, borderTop:'1px solid #1E1E2E' }}>
        <div style={{ fontSize:11, color:'#6B6B8A', marginBottom:8, paddingLeft:4 }}>JG Studio · Cape Coral, FL</div>
        <a href="/api/auth/signout" style={{ display:'block', fontSize:11, color:'#6B6B8A', textAlign:'center', padding:'6px', background:'rgba(255,255,255,.06)', borderRadius:8, textDecoration:'none' }}>Sign out</a>
      </div>
    </div>
  )
}
