import { Step } from "./step"

export interface Execution {
  executionId: string
  startedAt: string
  endedAt?: string
  steps: Step[]
  finalOutcome?: any
  metadata?: Record<string, any>   // ✅ NEW (safe)
}
