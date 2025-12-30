// API endpoint for manual reasoning processing
import { NextResponse } from 'next/server'
import { ReasoningQueue } from '@/xRay/reasoningQueue'
import { getUserIdFromRequest, unauthorizedResponse } from '@/lib/authMiddleware'
import { getExecutionById } from '@/lib/storage'

export async function POST(request: Request) {
  // Extract and validate userId from API key
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { executionId } = await request.json()

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      )
    }

    // Verify user owns this execution
    const execution = await getExecutionById(executionId, userId)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    const queue = ReasoningQueue.getInstance()

    // Process the execution
    await queue.processExecution(executionId)

    // Return success with stats
    return NextResponse.json({
      success: true,
      executionId,
      stats: queue.getStats()
    })

  } catch (error: any) {
    console.error('[XRay API] Processing error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
