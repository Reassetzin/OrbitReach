import Sidebar from '@/components/admin/Sidebar'
import MobileNav from '@/components/admin/MobileNav'
import MobileHeader from '@/components/admin/MobileHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', minHeight:'100dvh', fontFamily:'Inter,sans-serif' }}>
      <Sidebar />
      <MobileHeader />
      <main style={{ flex:1, overflow:'auto', background:'#F5F6FA' }}>
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
