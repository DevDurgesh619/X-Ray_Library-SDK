import { Execution } from "@/xRay"
import fs from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "executions.json")

export function saveExecution(execution: Execution) {
  const existing = loadExecutions()
  existing.push(execution)
  fs.writeFileSync(FILE_PATH, JSON.stringify(existing, null, 2))
}

export function loadExecutions(): Execution[] {
  if (!fs.existsSync(FILE_PATH)) {
    return []
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"))
}

export function getExecutionById(id: string): Execution | undefined {
  return loadExecutions().find(e => e.executionId === id)
}
