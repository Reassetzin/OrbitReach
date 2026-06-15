export default function PortalNav() {
  return (
    <header style={{ background:'#fff', borderBottom:'1px solid #E8EAF0' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 32px' }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6C63FF,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg viewBox="0 0 24 24" style={{ width:14, height:14 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span style={{ fontSize:14, fontWeight:600, color:'#0D0D1A', flex:1 }}>My Portal</span>
        <a href="/login" style={{ fontSize:11, color:'#94A3B8', textDecoration:'none', padding:'6px 12px', border:'1px solid #E8EAF0', borderRadius:8 }}>Sign out</a>
      </div>
    </header>
  )
}
