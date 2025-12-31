import { NextResponse } from "next/server"
import { ReasoningQueue } from "@/xRay/reasoningQueue"
import { getExecutionById } from "@/lib/storage"

/**
 * Internal API endpoint for dashboard to trigger reasoning without authentication
 * This is used by ExecutionReasoningTrigger component when user views an execution
 *
 * SECURITY: Only uses server's OpenAI key. Developers should generate reasoning
 * client-side first if they want to use their own API keys.
 */
export async function POST(request: Request) {
  try {
    const { executionId } = await request.json()

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      )
    }

    // Verify execution exists
    const execution = await getExecutionById(executionId)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    console.log(`[XRay Internal API] Using server's OpenAI key for reasoning generation`)

    const queue = ReasoningQueue.getInstance()

    // Log execution details before processing
    console.log(`[XRay Internal API] Processing reasoning for execution: ${executionId}`)
    console.log(`[XRay Internal API] Execution details:`, {
      executionId: execution.executionId,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      stepsCount: execution.steps.length,
      stepsWithReasoning: execution.steps.filter((s: any) => s.reasoning).length,
      stepsWithoutReasoning: execution.steps.filter((s: any) => !s.reasoning).length,
      stepNames: execution.steps.map((s: any) => ({
        name: s.name,
        hasReasoning: !!s.reasoning,
        reasoningLength: s.reasoning ? s.reasoning.length : 0
      }))
    })

    // Process the execution using server's OpenAI key only
    await queue.processExecution(executionId)

    // Return success with stats
    return NextResponse.json({
      success: true,
      executionId,
      stats: queue.getStats()
    })

  } catch (error: any) {
    console.error('[XRay Internal API] Processing error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
