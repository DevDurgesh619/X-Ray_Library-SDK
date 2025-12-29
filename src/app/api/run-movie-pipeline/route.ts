import { NextResponse } from "next/server"
import { runMovieRecommendation } from "@/demo/moviePipeline"
import { saveExecution } from "@/lib/storage"

export async function POST() {
  const { execution, xray } = await runMovieRecommendation()

  // Save FIRST, then enqueue reasoning (so queue can load from storage)
  await saveExecution(execution)
  xray.enqueueReasoning()

  return NextResponse.json({
    executionId: execution.executionId
  })
}
