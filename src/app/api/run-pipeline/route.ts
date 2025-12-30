import { NextResponse } from "next/server"
import { runPipeline } from "@/demo/pipeline"
import { saveExecution } from "@/lib/storage"
import { randomUUID } from "crypto"

export async function POST() {
  const executionId = randomUUID()
  const { execution } = await runPipeline(executionId)

  // Save execution to database immediately (without reasoning)
  await saveExecution(execution)

  // ❌ DON'T enqueue reasoning here
  // Reasoning will be triggered only when user views the execution detail page

  // Return immediately
  return NextResponse.json({
    executionId
  })
}
