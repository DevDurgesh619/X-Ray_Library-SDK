// API endpoint for reasoning queue statistics
import { NextResponse } from 'next/server'
import { ReasoningQueue } from '@/xRay/reasoningQueue'

export async function GET() {
  try {
    const queue = ReasoningQueue.getInstance()
    const stats = queue.getStats()

    return NextResponse.json({
      queue: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[XRay API] Stats error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
