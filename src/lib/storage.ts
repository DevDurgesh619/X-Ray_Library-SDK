// lib/storage.ts - Database storage with Prisma
import { Execution } from "@/xRay"
import { prisma } from "./prisma"

/**
 * Save a complete execution to the database
 * This will create a new execution with all steps in a single transaction
 */
export async function saveExecution(execution: Execution): Promise<void> {
  // Validate execution
  if (!execution || !execution.executionId || execution.steps.length === 0) {
    console.warn("Skipping invalid execution:", execution?.executionId)
    return
  }

  try {
    // Check if execution already exists
    const existing = await prisma.execution.findUnique({
      where: { executionId: execution.executionId },
    })

    if (existing) {
      // Update existing execution
      await prisma.execution.update({
        where: { executionId: execution.executionId },
        data: {
          metadata: execution.metadata || {},
          finalOutcome: execution.finalOutcome || {},
          completedAt: new Date(),
          // Delete old steps and create new ones
          steps: {
            deleteMany: {},
            create: execution.steps.map(step => ({
              name: step.name,
              input: step.input || {},
              output: step.output || {},
              error: step.error,
              durationMs: step.durationMs,
              reasoning: step.reasoning,
            })),
          },
        },
      })
      console.log(`[Storage] ✅ Updated execution ${execution.executionId}`)
    } else {
      // Create new execution with steps
      await prisma.execution.create({
        data: {
          executionId: execution.executionId,
          projectId: execution.metadata?.projectId || "default",
          metadata: execution.metadata || {},
          finalOutcome: execution.finalOutcome || {},
          steps: {
            create: execution.steps.map(step => ({
              name: step.name,
              input: step.input || {},
              output: step.output || {},
              error: step.error,
              durationMs: step.durationMs,
              reasoning: step.reasoning,
            })),
          },
        },
      })
      console.log(`[Storage] ✅ Created execution ${execution.executionId}`)
    }
  } catch (error) {
    console.error(`[Storage] ❌ Failed to save execution ${execution.executionId}:`, error)
    throw error
  }
}

/**
 * Load all executions from the database
 * Ordered by most recent first
 */
export async function loadExecutions(): Promise<Execution[]> {
  try {
    const executions = await prisma.execution.findMany({
      include: {
        steps: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 100, // Limit to last 100 executions
    })

    return executions.map((exec: any) => ({
      executionId: exec.executionId,
      startedAt: exec.startedAt.toISOString(),
      endedAt: exec.completedAt?.toISOString(),
      metadata: exec.metadata as any,
      finalOutcome: exec.finalOutcome as any,
      steps: exec.steps.map((step: any) => ({
        name: step.name,
        input: step.input as any,
        output: step.output as any,
        error: step.error || undefined,
        durationMs: step.durationMs || undefined,
        reasoning: step.reasoning || undefined,
      })),
    }))
  } catch (error) {
    console.error("[Storage] ❌ Failed to load executions:", error)
    return []
  }
}

/**
 * Get all executions (alias for loadExecutions)
 */
export async function getExecutions(): Promise<Execution[]> {
  return loadExecutions()
}

/**
 * Get a single execution by ID
 */
export async function getExecutionById(id: string): Promise<Execution | undefined> {
  try {
    const exec = await prisma.execution.findUnique({
      where: { executionId: id },
      include: {
        steps: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!exec) {
      return undefined
    }

    return {
      executionId: exec.executionId,
      startedAt: exec.startedAt.toISOString(),
      endedAt: exec.completedAt?.toISOString(),
      metadata: exec.metadata as any,
      finalOutcome: exec.finalOutcome as any,
      steps: exec.steps.map((step: any) => ({
        name: step.name,
        input: step.input as any,
        output: step.output as any,
        error: step.error || undefined,
        durationMs: step.durationMs || undefined,
        reasoning: step.reasoning || undefined,
      })),
    }
  } catch (error) {
    console.error(`[Storage] ❌ Failed to get execution ${id}:`, error)
    return undefined
  }
}

/**
 * Atomically update a single step's reasoning field
 * No mutex needed - database handles locking automatically
 */
export async function updateStepReasoning(
  executionId: string,
  stepName: string,
  reasoning: string
): Promise<void> {
  try {
    // Find the execution and step
    const execution = await prisma.execution.findUnique({
      where: { executionId },
      include: { steps: true },
    })

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    const step = execution.steps.find((s: any) => s.name === stepName)
    if (!step) {
      throw new Error(`Step ${stepName} not found in execution ${executionId}`)
    }

    // Update only the reasoning field
    await prisma.step.update({
      where: { id: step.id },
      data: { reasoning },
    })

    console.log(`[Storage] ✅ Updated reasoning for ${executionId}/${stepName}`)
  } catch (error) {
    console.error(`[Storage] ❌ Failed to update reasoning for ${executionId}/${stepName}:`, error)
    throw error
  }
}
