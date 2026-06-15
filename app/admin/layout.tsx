import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'Inter,sans-serif' }}>
      <Sidebar />
      <main style={{ flex:1, overflow:'auto', background:'#F5F6FA' }}>
        {children}
      </main>
    </div>
  )
}
