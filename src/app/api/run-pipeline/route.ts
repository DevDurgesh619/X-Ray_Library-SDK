import { NextResponse } from "next/server"
import { runPipeline } from "@/demo/pipeline"
import { saveExecution } from "@/lib/storage"
import { randomUUID } from "crypto"

export async function POST() {
  const executionId = randomUUID()
  const execution = runPipeline(executionId)

  saveExecution(execution)

  return NextResponse.json({
    executionId
  })
}
