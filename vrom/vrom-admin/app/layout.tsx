import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { UserProvider } from '@/lib/contexts/user-context'

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' })
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'Vrom OCC - Operations Command Center',
  description: 'Premium Admin Dashboard for Global Operations',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        <UserProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
