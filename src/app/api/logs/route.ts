import { NextResponse } from 'next/server'
import { saveExecution } from '@/lib/storage'
import { getUserIdFromRequest, unauthorizedResponse } from '@/lib/authMiddleware'

export async function POST(request: Request) {
  // Auth
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // Parse execution from request body
    const execution = await request.json()

    // Validate required fields
    if (!execution.executionId || !execution.steps || execution.steps.length === 0) {
      return NextResponse.json(
        { error: 'Invalid execution data' },
        { status: 400 }
      )
    }

    // Save to database
    await saveExecution(execution, userId)

    return NextResponse.json({
      success: true,
      executionId: execution.executionId
    })
  } catch (error: any) {
    console.error('[logs] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save execution' },
      { status: 500 }
    )
  }
}
