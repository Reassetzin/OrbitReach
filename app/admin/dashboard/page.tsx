export default function DashboardPage() {
  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'Inter,sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width:232, background:'#0F0F14', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'24px 20px', borderBottom:'1px solid #1E1E2E', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:'linear-gradient(135deg,#6C63FF,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" style={{ width:18, height:18 }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>Studio</div>
            <div style={{ fontSize:11, color:'#6B6B8A' }}>Client workspace</div>
          </div>
        </div>
        <nav style={{ flex:1, padding:12 }}>
          {[
            { label:'Dashboard', href:'/admin/dashboard', active:true },
            { label:'Clients', href:'/admin/clients', active:false },
            { label:'Tasks', href:'/admin/tasks', active:false },
            { label:'Revenue', href:'/admin/revenue', active:false },
            { label:'Requests', href:'/admin/requests', active:false },
          ].map(item => (
            <a key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, marginBottom:2, textDecoration:'none', fontSize:12, color: item.active ? '#fff' : '#6B6B8A', background: item.active ? '#22223A' : 'transparent', fontWeight: item.active ? 500 : 400, position:'relative' }}>
              {item.active && <div style={{ position:'absolute', left:0, top:6, bottom:6, width:3, background:'#6C63FF', borderRadius:'0 3px 3px 0' }}/>}
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding:12, borderTop:'1px solid #1E1E2E' }}>
          <div style={{ fontSize:12, color:'#6B6B8A', marginBottom:8 }}>joao@sundegomes.com</div>
          <a href="/login" style={{ display:'block', fontSize:11, color:'#6B6B8A', textAlign:'center', padding:'6px', background:'rgba(255,255,255,.06)', borderRadius:8, textDecoration:'none' }}>Sign out</a>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto', background:'#F5F6FA' }}>
        <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Overview</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Dashboard</div>
          </div>
          <a href="/admin/clients/new" style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', boxShadow:'0 8px 24px rgba(108,99,255,.25)' }}>+ Add client</a>
        </div>

        <div style={{ padding:'24px 32px' }}>
          {/* Metric cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
            {[
              { label:'Monthly Recurring', value:'$0', color:'linear-gradient(135deg,#6C63FF,#A855F7)', shadow:'rgba(108,99,255,.3)' },
              { label:'Active Clients', value:'0', color:'linear-gradient(135deg,#FF6B9D,#FF8C69)', shadow:'rgba(255,107,157,.3)' },
              { label:'Open Tasks', value:'0', color:'linear-gradient(135deg,#3B82F6,#06B6D4)', shadow:'rgba(59,130,246,.3)' },
              { label:'New Requests', value:'0', color:'linear-gradient(135deg,#10B981,#059669)', shadow:'rgba(16,185,129,.3)' },
            ].map(c => (
              <div key={c.label} style={{ background:c.color, borderRadius:20, padding:20, boxShadow:`0 8px 24px ${c.shadow}`, minHeight:120, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{c.label}</div>
                <div style={{ fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-.03em' }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:16 }}>🚀</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A', marginBottom:8 }}>Ready to go</div>
            <div style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Add your first client to get started.</div>
            <a href="/admin/clients/new" style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Add first client →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
