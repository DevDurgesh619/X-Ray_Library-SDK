// lib/storage.ts
import { Execution } from "@/xRay"
import fs from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "executions.json")

// Simple in-memory mutex lock to prevent concurrent file writes
let isWriting = false
const writeQueue: Array<() => void> = []

function acquireLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!isWriting) {
      isWriting = true
      resolve()
    } else {
      writeQueue.push(() => resolve())
    }
  })
}

function releaseLock() {
  if (writeQueue.length > 0) {
    const next = writeQueue.shift()!
    next()
  } else {
    isWriting = false
  }
}

export async function saveExecution(execution: Execution) {
  // 🔥 VALIDATE: skip invalid executions
  if (!execution || !execution.executionId || execution.steps.length === 0) {
    console.warn("Skipping invalid execution:", execution?.executionId)
    return
  }

  // Acquire lock to prevent concurrent load-modify-write operations
  await acquireLock()

  try {
    // Load INSIDE the lock to prevent race conditions
    let existing: Execution[] = []
    if (fs.existsSync(FILE_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"))
        existing = Array.isArray(data)
          ? data.filter((e: any) => e && e.executionId && e.steps && e.steps.length > 0)
          : []
      } catch (error) {
        console.error("Failed to load executions during save:", error)
        existing = []
      }
    }

    // 🔥 UPSERT: replace if ID exists, append if new
    const index = existing.findIndex(e => e.executionId === execution.executionId)
    if (index >= 0) {
      existing[index] = execution
    } else {
      existing.push(execution)
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2))
  } finally {
    // Always release lock, even if write fails
    releaseLock()
  }
}

export function loadExecutions(): Execution[] {
  if (!fs.existsSync(FILE_PATH)) {
    return []
  }
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"))
    // 🔥 CLEANUP: filter out invalid entries on load
    return Array.isArray(data) 
      ? data.filter((e: any) => e && e.executionId && e.steps && e.steps.length > 0)
      : []
  } catch (error) {
    console.error("Failed to load executions:", error)
    return []
  }
}

export function getExecutions(): Execution[] {
  return loadExecutions()
}

export function getExecutionById(id: string): Execution | undefined {
  return loadExecutions().find(e => e.executionId === id)
}

/**
 * Atomically update a single step's reasoning field
 * This prevents race conditions when multiple jobs update different steps concurrently
 */
export async function updateStepReasoning(
  executionId: string,
  stepName: string,
  reasoning: string
): Promise<void> {
  // Acquire lock to ensure atomic load-modify-write
  await acquireLock()

  try {
    // Load current state INSIDE the lock
    let existing: Execution[] = []
    if (fs.existsSync(FILE_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"))
        existing = Array.isArray(data)
          ? data.filter((e: any) => e && e.executionId && e.steps && e.steps.length > 0)
          : []
      } catch (error) {
        console.error("Failed to load executions during reasoning update:", error)
        throw new Error(`Failed to load executions: ${error}`)
      }
    }

    // Find the execution
    const executionIndex = existing.findIndex(e => e.executionId === executionId)
    if (executionIndex === -1) {
      throw new Error(`Execution ${executionId} not found`)
    }

    // Find the step
    const execution = existing[executionIndex]
    const step = execution.steps.find(s => s.name === stepName)
    if (!step) {
      throw new Error(`Step ${stepName} not found in execution ${executionId}`)
    }

    // Update ONLY the reasoning field
    step.reasoning = reasoning

    // Write back with the updated step
    fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2))

    console.log(`[Storage] ✅ Updated reasoning for ${executionId}/${stepName}`)
  } finally {
    // Always release lock
    releaseLock()
  }
}
