// lib/storage.ts
import { Execution } from "@/xRay"
import fs from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "executions.json")

export function saveExecution(execution: Execution) {
  // 🔥 VALIDATE: skip invalid executions
  if (!execution || !execution.executionId || execution.steps.length === 0) {
    console.warn("Skipping invalid execution:", execution?.executionId)
    return
  }

  const existing = loadExecutions()
  
  // 🔥 UPSERT: replace if ID exists, append if new
  const index = existing.findIndex(e => e.executionId === execution.executionId)
  if (index >= 0) {
    existing[index] = execution
  } else {
    existing.push(execution)
  }
  
  fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2))
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
