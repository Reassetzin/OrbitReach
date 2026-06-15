export default function RequestsPage() {
  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Requests</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Requests</div>
      </div>
      <div style={{ padding:'24px 32px' }}>
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>📥</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No requests yet</div>
          <div style={{ fontSize:13, color:'#94A3B8' }}>Client requests will appear here.</div>
        </div>
      </div>
    </div>
  )
}
