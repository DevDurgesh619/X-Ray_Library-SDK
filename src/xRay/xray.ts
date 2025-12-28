import { Execution } from "./execution"
import { generateStepReasoning } from "./llmReasoning"
import { Step } from "./step"

export class XRay {
  private execution: Execution
  private activeSteps = new Map<string, Step>()

  constructor(executionId: string, metadata?: Record<string, any>) {
    this.execution = {
      executionId,
      startedAt: new Date().toISOString(),
      steps: [],
      metadata
    }
  }

  /** ✅ BACKWARD-COMPATIBLE (v1) – no auto reasoning */
  logStep(step: {
    name: string
    input: any
    output: any
    metadata?: Record<string, any>
  }) {
    this.execution.steps.push({
      name: step.name,
      input: step.input,
      output: step.output,
      timestamp: new Date().toISOString(),
      metadata: step.metadata
      // reasoning can be added manually via metadata.reasoning if needed
    })
  }

  /** Start a step (v2) */
  startStep(name: string, input: any, metadata?: Record<string, any>) {
    const step: Step = {
      name,
      input,
      timestamp: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      metadata
    }
    this.activeSteps.set(name, step)
  }

  /** Finish a step (v3) – auto‑generates reasoning from input/output */
  async endStep(name: string, output: any) {
    const step = this.activeSteps.get(name)
    if (!step) return

    step.output = output
    step.endedAt = new Date().toISOString()
    step.durationMs =
      new Date(step.endedAt).getTime() -
      new Date(step.startedAt!).getTime()

    // Auto-generate generic reasoning
    step.reasoning = await generateStepReasoning(step)

    this.execution.steps.push(step)
    this.activeSteps.delete(name)
  }

  /** Capture error inside a step (v2) */
  async errorStep(name: string, error: Error) {
    const step = this.activeSteps.get(name)
    if (!step) return

    step.error = error.message
    step.endedAt = new Date().toISOString()
    step.durationMs =
      new Date(step.endedAt).getTime() -
      new Date(step.startedAt!).getTime()

    // Auto-reasoning for failed step
    step.reasoning = await generateStepReasoning(step)

    this.execution.steps.push(step)
    this.activeSteps.delete(name)
  }

  /** End execution */
  end(finalOutcome: any) {
    this.execution.endedAt = new Date().toISOString()
    this.execution.finalOutcome = finalOutcome
    return this.execution
  }
}
