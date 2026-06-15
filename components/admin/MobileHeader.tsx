'use client'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/clients':   'Clients',
  '/admin/tasks':     'Tasks',
  '/admin/revenue':   'Revenue',
  '/admin/requests':  'Requests',
}

export default function MobileHeader() {
  const p = usePathname()
  const title = Object.entries(TITLES).find(([k]) => p.startsWith(k))?.[1] ?? 'Studio'
  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:150,
      background:'#0F0F14', borderBottom:'1px solid #1E1E2E',
      height:52, display:'flex', alignItems:'center',
      padding:'0 16px', gap:10,
    }}>
      <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#6C63FF,#A855F7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg viewBox="0 0 24 24" style={{width:14,height:14}} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <span style={{fontSize:15,fontWeight:700,color:'#fff',flex:1}}>{title}</span>
      <a href="/admin/clients/new" style={{fontSize:11,fontWeight:600,color:'#fff',background:'linear-gradient(135deg,#6C63FF,#A855F7)',padding:'5px 10px',borderRadius:7,textDecoration:'none'}}>+ Client</a>
    </div>
  )
}
