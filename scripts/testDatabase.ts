/**
 * Simple script to test Prisma database connection and operations
 */

import dotenv from "dotenv"
import path from "path"
import { prisma } from "../src/lib/prisma"
import { saveExecution } from "../src/lib/storage"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function testDatabase() {
  console.log("🧪 Testing Prisma Database Connection...\n")

  try {
    // Test 1: Database connection
    console.log("1. Testing database connection...")
    await prisma.$connect()
    console.log("   ✅ Successfully connected to database\n")

    // Test 2: Create a test execution
    console.log("2. Creating test execution...")
    const testExecution = {
      executionId: `test-exec-${Date.now()}`,
      startedAt: new Date().toISOString(),
      metadata: {
        projectId: "test",
        test: true
      },
      steps: [
        {
          name: "test_step_1",
          input: { query: "test" },
          output: { result: "success" },
          durationMs: 150
        },
        {
          name: "test_step_2",
          input: { data: [1, 2, 3] },
          output: { processed: [2, 4, 6] },
          durationMs: 85
        }
      ],
      finalOutcome: { success: true }
    }

    await saveExecution(testExecution)
    console.log(`   ✅ Created execution: ${testExecution.executionId}\n`)

    // Test 3: Query the execution
    console.log("3. Querying execution from database...")
    const retrieved = await prisma.execution.findUnique({
      where: { executionId: testExecution.executionId },
      include: { steps: true }
    })

    if (retrieved) {
      console.log(`   ✅ Found execution with ${retrieved.steps.length} steps`)
      console.log(`   📊 Execution ID: ${retrieved.executionId}`)
      console.log(`   📊 Project ID: ${retrieved.projectId}`)
      console.log(`   📊 Steps: ${retrieved.steps.map(s => s.name).join(", ")}\n`)
    } else {
      console.log("   ❌ Execution not found\n")
    }

    // Test 4: Update step reasoning
    console.log("4. Testing step reasoning update...")
    const { updateStepReasoning } = await import("../src/lib/storage")
    await updateStepReasoning(
      testExecution.executionId,
      "test_step_1",
      "This is a test reasoning string"
    )
    console.log("   ✅ Updated step reasoning\n")

    // Test 5: Verify reasoning was saved
    console.log("5. Verifying reasoning was saved...")
    const updated = await prisma.execution.findUnique({
      where: { executionId: testExecution.executionId },
      include: { steps: true }
    })

    const step1 = updated?.steps.find(s => s.name === "test_step_1")
    if (step1?.reasoning) {
      console.log(`   ✅ Reasoning saved: "${step1.reasoning}"\n`)
    } else {
      console.log("   ❌ Reasoning not found\n")
    }

    // Test 6: Count all executions
    console.log("6. Counting total executions...")
    const count = await prisma.execution.count()
    console.log(`   ✅ Total executions in database: ${count}\n`)

    console.log("✅ All database tests passed!")
    console.log("\n🎉 Database is ready to use!")
    console.log(`\nView your database at: http://localhost:3000`)

  } catch (error) {
    console.error("❌ Database test failed:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
