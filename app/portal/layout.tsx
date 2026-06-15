import PortalNav from '@/components/portal/PortalNav'
import PortalMobileNav from '@/components/portal/PortalMobileNav'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100dvh', background:'#F5F6FA' }}>
      <PortalNav />
      <main style={{ paddingBottom:48 }}>{children}</main>
      <PortalMobileNav />
    </div>
  )
}
