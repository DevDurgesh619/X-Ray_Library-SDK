import { NextResponse } from "next/server"
import { runPipeline } from "@/demo/pipeline"
import { saveExecution } from "@/lib/storage"
import { randomUUID } from "crypto"
import { getUserIdFromRequest, unauthorizedResponse } from "@/lib/authMiddleware"

export async function POST(request: Request) {
  // Extract and validate userId from API key
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const executionId = randomUUID()
    const { execution } = await runPipeline(executionId)

    // Save execution to database with userId
    await saveExecution(execution, userId)

    // ❌ DON'T enqueue reasoning here
    // Reasoning will be triggered only when user views the execution detail page

    // Return immediately
    return NextResponse.json({
      executionId
    })
  } catch (error: any) {
    console.error('[run-pipeline] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run pipeline' },
      { status: 500 }
    )
  }
}
