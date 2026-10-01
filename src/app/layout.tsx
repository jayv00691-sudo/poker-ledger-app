import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PrivacyProvider } from '@/components/PrivacyContext'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: '扑克账本 · 线下现金局记账',
  description: '德州扑克线下现金局记账系统：买入、退码、抽水、保险一体化对账',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F6F8FB',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <PrivacyProvider>
          <AppShell>{children}</AppShell>
        </PrivacyProvider>
      </body>
    </html>
  )
}
