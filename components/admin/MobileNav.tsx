'use client'
import { usePathname } from 'next/navigation'

const NAV = [
  { label:'Home',     href:'/admin/dashboard', d:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
  { label:'Clients',  href:'/admin/clients',   d:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
  { label:'Tasks',    href:'/admin/tasks',     d:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label:'Revenue',  href:'/admin/revenue',   d:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { label:'Requests', href:'/admin/requests',  d:'M22 12h-6l-2 3h-4l-2-3H2' },
]

export default function MobileNav() {
  const p = usePathname()
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:200,
      background:'#0F0F14', borderTop:'1px solid #1E1E2E',
      display:'flex', justifyContent:'space-around',
      padding:'4px 0',
      paddingBottom:'calc(4px + env(safe-area-inset-bottom, 0px))',
    }}>
      {NAV.map(item => {
        const active = p === item.href || (item.href !== '/admin/dashboard' && p.startsWith(item.href))
        return (
          <a key={item.href} href={item.href} style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            gap:2, flex:1, padding:'6px 2px', textDecoration:'none',
            color: active ? '#6C63FF' : '#6B6B8A',
            fontSize:10, fontWeight: active ? 600 : 400,
          }}>
            <svg viewBox="0 0 24 24" style={{width:22,height:22}} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.d}/>
            </svg>
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
