/**
 * Script to manually process reasoning generation for executions
 * Usage: npm run reasoning:process -- <executionId>
 *        npm run reasoning:process -- --all
 */

import dotenv from "dotenv"
import path from "path"
import { ReasoningQueue } from "../src/xRay/reasoningQueue"
import { getExecutions } from "../src/lib/storage"

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const args = process.argv.slice(2)
  const queue = ReasoningQueue.getInstance()

  console.log("🧠 X-Ray Reasoning Processor\n")
  console.log("=" .repeat(60))

  if (args.includes("--all")) {
    // Process all executions
    const executions = getExecutions()
    console.log(`\n📦 Found ${executions.length} executions\n`)

    if (executions.length === 0) {
      console.log("No executions found to process.")
      return
    }

    for (let i = 0; i < executions.length; i++) {
      const exec = executions[i]
      console.log(`[${i + 1}/${executions.length}] Processing execution: ${exec.executionId}`)

      try {
        await queue.processExecution(exec.executionId)
      } catch (error: any) {
        console.error(`    Error: ${error.message}`)
      }
    }

  } else if (args[0]) {
    // Process specific execution
    const executionId = args[0]
    console.log(`\n🎯 Processing execution: ${executionId}\n`)

    try {
      await queue.processExecution(executionId)
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }

  } else {
    // Show usage
    console.log("\n📖 Usage:")
    console.log("  npm run reasoning:process -- <executionId>")
    console.log("  npm run reasoning:process -- --all")
    console.log("\nExamples:")
    console.log("  npm run reasoning:process -- exec-abc123")
    console.log("  npm run reasoning:process -- --all")
    console.log()
    process.exit(0)
  }

  // Show final stats
  console.log("\n" + "=".repeat(60))
  console.log("📊 Queue Statistics")
  console.log("=".repeat(60))

  const stats = queue.getStats()
  console.log(`Total jobs:       ${stats.totalJobs}`)
  console.log(`Pending:          ${stats.pending}`)
  console.log(`Processing:       ${stats.processing}`)
  console.log(`Completed:        ${stats.completed}`)
  console.log(`Failed:           ${stats.failed}`)
  console.log()

  if (stats.failed > 0) {
    console.log("  Some jobs failed. Check logs for details.")
  } else {
    console.log(" All jobs completed successfully!")
  }
  console.log()
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
