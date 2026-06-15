export default function DashboardPage() {
  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Overview</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Dashboard</div>
        </div>
        <a href="/admin/clients/new" style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', boxShadow:'0 8px 24px rgba(108,99,255,.25)' }}>+ Add client</a>
      </div>
      <div style={{ padding:'24px 32px' }}>
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
              <div style={{ fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-.03em', position:'relative', zIndex:1 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>🚀</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A', marginBottom:8 }}>Ready to go</div>
          <div style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Add your first client to get started.</div>
          <a href="/admin/clients/new" style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Add first client →</a>
        </div>
      </div>
    </div>
  )
}
