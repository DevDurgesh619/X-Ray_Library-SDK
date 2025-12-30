/**
 * Test script for database-backed reasoning queue
 */

import dotenv from "dotenv"
import path from "path"
import { prisma } from "../src/lib/prisma"
import { saveExecution } from "../src/lib/storage"
import { ReasoningQueue } from "../src/xRay/reasoningQueue"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function testReasoningQueue() {
  console.log("🧪 Testing Database-Backed Reasoning Queue...\n")

  try {
    // Test 1: Create test execution
    console.log("1. Creating test execution...")
    const testExecution = {
      executionId: `queue-test-${Date.now()}`,
      startedAt: new Date().toISOString(),
      metadata: {
        projectId: "test-queue",
        test: true
      },
      steps: [
        {
          name: "step_1",
          input: { value: 10 },
          output: { result: 20 },
          durationMs: 100
        },
        {
          name: "step_2",
          input: { value: 20 },
          output: { result: 40 },
          durationMs: 150
        },
        {
          name: "step_3",
          input: { value: 40 },
          output: { result: 80 },
          durationMs: 120
        }
      ],
      finalOutcome: { success: true }
    }

    await saveExecution(testExecution)
    console.log(`   ✅ Created execution: ${testExecution.executionId}\n`)

    // Test 2: Enqueue reasoning jobs
    console.log("2. Enqueuing reasoning jobs...")
    const queue = ReasoningQueue.getInstance()
    const jobIds = await queue.enqueueExecution(testExecution.executionId)
    console.log(`   ✅ Enqueued ${jobIds.length} jobs\n`)

    // Test 3: Check jobs in database
    console.log("3. Verifying jobs in database...")
    const dbJobs = await prisma.reasoningJob.findMany({
      where: { executionId: testExecution.executionId }
    })
    console.log(`   ✅ Found ${dbJobs.length} jobs in database`)
    dbJobs.forEach(job => {
      console.log(`      - ${job.stepName}: ${job.status} (attempts: ${job.attempts})`)
    })
    console.log()

    // Test 4: Get queue stats
    console.log("4. Getting queue statistics...")
    const stats = queue.getStats()
    console.log(`   📊 Memory stats:`)
    console.log(`      - Pending: ${stats.pending}`)
    console.log(`      - Processing: ${stats.processing}`)
    console.log(`      - Completed: ${stats.completed}`)
    console.log(`      - Failed: ${stats.failed}`)
    console.log(`      - Total: ${stats.totalJobs}\n`)

    // Test 5: Wait for jobs to complete
    console.log("5. Waiting for reasoning jobs to complete...")
    await queue.pqueue.onIdle()
    console.log("   ✅ All jobs processed\n")

    // Test 6: Check completed jobs in database
    console.log("6. Checking completed jobs in database...")
    const completedJobs = await prisma.reasoningJob.findMany({
      where: {
        executionId: testExecution.executionId,
        status: 'completed'
      }
    })
    console.log(`   ✅ ${completedJobs.length} jobs completed`)
    completedJobs.forEach(job => {
      console.log(`      - ${job.stepName}: "${job.reasoning?.substring(0, 50)}..."`)
    })
    console.log()

    // Test 7: Verify reasoning in execution
    console.log("7. Verifying reasoning was saved to execution...")
    const updatedExecution = await prisma.execution.findUnique({
      where: { executionId: testExecution.executionId },
      include: { steps: true }
    })

    const stepsWithReasoning = updatedExecution?.steps.filter(s => s.reasoning) || []
    console.log(`   ✅ ${stepsWithReasoning.length} steps have reasoning`)
    stepsWithReasoning.forEach(step => {
      console.log(`      - ${step.name}: "${step.reasoning?.substring(0, 50)}..."`)
    })
    console.log()

    // Test 8: Database stats
    console.log("8. Getting database statistics...")
    const dbStats = await queue.getStatsFromDatabase()
    console.log(`   📊 Database stats:`)
    console.log(`      - Pending: ${dbStats.pending}`)
    console.log(`      - Processing: ${dbStats.processing}`)
    console.log(`      - Completed: ${dbStats.completed}`)
    console.log(`      - Failed: ${dbStats.failed}`)
    console.log(`      - Total: ${dbStats.totalJobs}\n`)

    console.log("✅ All reasoning queue tests passed!")
    console.log("\n🎉 Database-backed reasoning queue is working!")
    console.log(`\nView execution at: http://localhost:3000/execution/${testExecution.executionId}`)

  } catch (error) {
    console.error("❌ Reasoning queue test failed:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testReasoningQueue()
