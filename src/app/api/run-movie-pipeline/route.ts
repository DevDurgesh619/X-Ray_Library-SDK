import { NextResponse } from "next/server"
import { runMovieRecommendation } from "@/demo/moviePipeline"
import { saveExecution } from "@/lib/storage"
import { getUserIdFromRequest, unauthorizedResponse } from "@/lib/authMiddleware"

export async function POST(request: Request) {
  // Extract and validate userId from API key
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { execution } = await runMovieRecommendation()

    // Save execution to database with userId
    await saveExecution(execution, userId)

    // ❌ DON'T enqueue reasoning here
    // Reasoning will be triggered only when user views the execution detail page

    // Return immediately
    return NextResponse.json({
      executionId: execution.executionId
    })
  } catch (error: any) {
    console.error('[run-movie-pipeline] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run pipeline' },
      { status: 500 }
    )
  }
}
