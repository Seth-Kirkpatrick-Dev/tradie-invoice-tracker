import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorker from '@/components/ServiceWorker'

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaidUp — Invoice Tracker',
  description: 'Get paid faster. Stop chasing invoices.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PaidUp',
  },
  openGraph: {
    title: 'PaidUp — Invoice Tracker',
    description: 'Get paid faster. Stop chasing invoices.',
    type: 'website',
    images: [{ url: '/icon-192.png', width: 192, height: 192, alt: 'PaidUp' }],
  },
  twitter: {
    card: 'summary',
    title: 'PaidUp — Invoice Tracker',
    description: 'Get paid faster. Stop chasing invoices.',
    images: ['/icon-192.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${geist.variable} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col font-[var(--font-geist)]">
        <ServiceWorker />
        {children}
      </body>
    </html>
  )
}
