import { NextResponse } from "next/server"
import { runMovieRecommendation } from "@/demo/moviePipeline"
import { saveExecution } from "@/lib/storage"

export async function POST() {
  const execution = await runMovieRecommendation()
  saveExecution(execution)

  return NextResponse.json({
    executionId: execution.executionId
  })
}
