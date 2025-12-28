import { NextResponse } from "next/server"
import { runPipeline } from "@/demo/pipeline"
import { saveExecution } from "@/lib/storage"
import { randomUUID } from "crypto"

export async function POST() {
  const executionId = randomUUID()
  const execution = await runPipeline(executionId)  // ✅ AWAIT!
  
  await saveExecution(execution)                    // ✅ AWAIT!

  return NextResponse.json({
    executionId
  })
}
