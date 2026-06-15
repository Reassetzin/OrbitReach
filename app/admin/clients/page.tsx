export default function ClientsPage() {
  return (
    <div>
      <div style={{ padding:'16px 32px', borderBottom:'1px solid #E8EAF0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div><div style={{ fontSize:11, color:'#94A3B8' }}>Studio / Clients</div><div style={{ fontSize:18, fontWeight:700, color:'#0D0D1A' }}>Clients</div></div>
        <a href="/admin/clients/new" style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>+ Add client</a>
      </div>
      <div style={{ padding:'24px 32px' }}>
        <div style={{ background:'#fff', border:'1px solid #E8EAF0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:16 }}>👥</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No clients yet</div>
          <div style={{ fontSize:13, color:'#94A3B8', marginBottom:24 }}>Add your first client to get started.</div>
          <a href="/admin/clients/new" style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#A855F7)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>Add first client →</a>
        </div>
      </div>
    </div>
  )
}
