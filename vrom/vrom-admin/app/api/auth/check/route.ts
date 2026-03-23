import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check if user has authentication cookie or session
  // For demo purposes, we'll allow access
  // In production, verify with your Go backend
  
  return NextResponse.json({ authenticated: true })
}
