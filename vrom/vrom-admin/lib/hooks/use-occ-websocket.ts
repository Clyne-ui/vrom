'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export function useOCCWebSocket(topic: string) {
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vrom_session_token') || '' : ''
    if (!token || token === 'undefined') {
      console.warn('WS: No valid session token found, skipping connection.')
      setStatus('disconnected')
      return
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/occ?token=${encodeURIComponent(token)}`
    console.log(`WS: Attempting connection to ${wsUrl}`)
    
    setStatus('connecting')
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log(`WS: Connection Established (Topic: ${topic})`)
      setStatus('connected')
      ws.send(JSON.stringify({ action: 'subscribe', topic }))
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        setData(payload)
      } catch (err) {
        console.error('WS: Data parsing error', err)
      }
    }

    ws.onclose = (event) => {
      console.warn(`WS: Connection Closed (Topic: ${topic}). Code: ${event.code}, Reason: ${event.reason}`)
      setStatus('disconnected')
      
      // Auto-reconnect after 5 seconds if not deliberately closed
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    }

    ws.onerror = (err) => {
      // Don't log if already closing/closed to avoid clutter
      if (ws.readyState === WebSocket.OPEN) {
        console.error('WS: Runtime Error', err)
      }
    }
  }, [topic])

  useEffect(() => {
    connect()
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return { data, status }
}
