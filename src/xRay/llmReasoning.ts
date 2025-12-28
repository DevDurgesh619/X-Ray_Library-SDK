// lib/llmReasoning.ts
import { openaiExplainStep } from "@/lib/openaiReasoner"
import { Step } from "./step"

export async function generateStepReasoning(step: Step): Promise<string> {
  if (step.error) {
    return `❌ ${step.name} failed: ${step.error}`
  }
  
  // LLM-powered reasoning (works for ANY pipeline)
  return await openaiExplainStep(step)
}
