import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Studio Portal',
  description: 'Client management and portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
