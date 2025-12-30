import { NextResponse } from "next/server"
import { runMovieRecommendation } from "@/demo/moviePipeline"
import { saveExecution } from "@/lib/storage"

export async function POST() {
  const { execution } = await runMovieRecommendation()

  // Save execution to database immediately (without reasoning)
  await saveExecution(execution)

  // ❌ DON'T enqueue reasoning here
  // Reasoning will be triggered only when user views the execution detail page

  // Return immediately
  return NextResponse.json({
    executionId: execution.executionId
  })
}
