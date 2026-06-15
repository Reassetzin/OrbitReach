export default function RevenuePage() {
  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Revenue</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Revenue</div>
      </div>
      <div style={{ padding:'24px 32px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'MRR', value:'$0', color:'linear-gradient(135deg,#6C63FF,#A855F7)' },
            { label:'YTD Collected', value:'$0', color:'linear-gradient(135deg,#3B82F6,#06B6D4)' },
            { label:'Outstanding', value:'$0', color:'linear-gradient(135deg,#FF6B9D,#FF8C69)' },
          ].map(c => (
            <div key={c.label} style={{ background:c.color, borderRadius:20, padding:20, minHeight:120, display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:500 }}>{c.label}</div>
              <div style={{ fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-.03em' }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>💰</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No revenue data yet</div>
          <div style={{ fontSize:13, color:'#94A3B8' }}>Revenue will appear here once you add clients with retainers.</div>
        </div>
      </div>
    </div>
  )
}
