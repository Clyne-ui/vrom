'use client'

import { useEffect, useState } from 'react'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setMounted(true)
    applyTheme()
    
    // Check time every minute
    const interval = setInterval(applyTheme, 60000)
    return () => clearInterval(interval)
  }, [])

  const applyTheme = () => {
    const hour = new Date().getHours()
    // Light mode: 6 AM (6) to 7 PM (19)
    // Dark mode: 7 PM (19) to 6 AM (6)
    const isDark = hour >= 19 || hour < 6
    const newTheme = isDark ? 'dark' : 'light'
    
    setTheme(newTheme)
    const html = document.documentElement
    
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const html = document.documentElement
    const isDark = html.classList.contains('dark')
    
    if (isDark) {
      html.classList.remove('dark')
      setTheme('light')
    } else {
      html.classList.add('dark')
      setTheme('dark')
    }
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <div>
      {children}
    </div>
  )
}
