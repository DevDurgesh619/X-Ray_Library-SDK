import { NextResponse } from "next/server"
import { runPipeline } from "@/demo/pipeline"
import { saveExecution } from "@/lib/storage"
import { randomUUID } from "crypto"

export async function POST() {
  const executionId = randomUUID()
  const { execution, xray } = await runPipeline(executionId)

  // Save FIRST, then enqueue reasoning (so queue can load from storage)
  await saveExecution(execution)
  xray.enqueueReasoning()

  return NextResponse.json({
    executionId
  })
}
