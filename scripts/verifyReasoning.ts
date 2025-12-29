/**
 * Script to verify reasoning generation for different pipeline step cases
 * Reads comprehensive dataset and generates reasoning for each step to validate correctness
 */

import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { Step } from "../src/xRay/step"
import { generateStepReasoning } from "../src/xRay/llmReasoning"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

interface ProductData {
  reference_product: {
    asin: string
    title: string
    price: number
    rating: number
    reviews: number
    category: string
  }
  pipeline_steps: {
    step1_keyword_generation: any
    step2_candidate_search: any
    step3_apply_filters: any
    step4_llm_relevance_evaluation: any
    step5_rank_and_select: any
  }
  final_outcome: any
}

interface ReasoningTestCase {
  productTitle: string
  productAsin: string
  stepName: string
  stepNumber: number
  input: any
  output: any
  generatedReasoning: string
  category: string
  notes?: string
}

async function generateReasoningForStep(
  stepName: string,
  stepData: any
): Promise<string> {
  const step: Step = {
    name: stepName,
    input: stepData.input,
    output: stepData.output,
    timestamp: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 0
  }

  return await generateStepReasoning(step)
}

function categorizeStep(stepName: string, output: any): string {
  if (stepName === "apply_filters") {
    if (output.passed === 0) return "❌ All candidates failed filters"
    if (output.passed / output.total_evaluated > 0.8) return "⚠️ Filters too lenient"
    return "✅ Normal filter case"
  }

  if (stepName === "llm_relevance_evaluation") {
    if (output.confirmed_competitors === 0) return "❌ No competitors found"
    if (output.false_positives_removed === 0) return "✅ All passed LLM check"
    if (output.false_positives_removed / output.total_evaluated > 0.5) {
      return "⚠️ Many false positives"
    }
    return "✅ Normal LLM evaluation"
  }

  if (stepName === "candidate_search") {
    if (output.candidates_fetched < 5) return "⚠️ Very few candidates"
    if (output.total_results > 10000) return "⚠️ Massive result set"
    return "✅ Normal search"
  }

  if (stepName === "rank_and_select") {
    const candidates = output.ranked_candidates?.length || 0
    if (candidates === 0) return "❌ No candidates to rank"
    if (candidates === 1) return "⚠️ Only one candidate"
    return "✅ Normal ranking"
  }

  return "✅ Normal case"
}

function extractStepNotes(stepName: string, stepData: any): string | undefined {
  const output = stepData.output

  if (stepName === "apply_filters") {
    const failReasons: string[] = []
    if (output.evaluations) {
      const priceFailures = output.evaluations.filter(
        (e: any) => e.filter_results?.price_range?.passed === false
      ).length
      const ratingFailures = output.evaluations.filter(
        (e: any) => e.filter_results?.min_rating?.passed === false
      ).length
      const reviewFailures = output.evaluations.filter(
        (e: any) => e.filter_results?.min_reviews?.passed === false
      ).length

      if (priceFailures > 0) failReasons.push(`${priceFailures} price failures`)
      if (ratingFailures > 0) failReasons.push(`${ratingFailures} rating failures`)
      if (reviewFailures > 0) failReasons.push(`${reviewFailures} review failures`)
    }
    return failReasons.length > 0 ? failReasons.join(", ") : undefined
  }

  if (stepName === "llm_relevance_evaluation" && output.evaluations) {
    const rejectionReasons = new Map<string, number>()
    output.evaluations.forEach((e: any) => {
      if (e.rejection_reason) {
        const code = e.rejection_reason.code
        rejectionReasons.set(code, (rejectionReasons.get(code) || 0) + 1)
      }
    })
    if (rejectionReasons.size > 0) {
      const reasons = Array.from(rejectionReasons.entries())
        .map(([code, count]) => `${count}x ${code}`)
        .join(", ")
      return `Rejected: ${reasons}`
    }
  }

  return undefined
}

async function main() {
  const outputLines: string[] = []
  const log = (message: string = "") => {
    console.log(message)
    outputLines.push(message)
  }

  log("🔍 X-Ray Reasoning Verification Tool\n")
  log("=".repeat(80))

  // Read dataset
  const datasetPath = path.join(process.cwd(), "comprehensive_products_dataset.json")
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"))
  const products = dataset.products as ProductData[]

  // LIMIT TO FIRST 2 PRODUCTS FOR TESTING
  const productsToTest = products.slice(0, 2)

  log(`📦 Loaded ${products.length} products from dataset`)
  log(`🎯 Testing first ${productsToTest.length} products\n`)

  const testCases: ReasoningTestCase[] = []

  // Process each product
  for (let i = 0; i < productsToTest.length; i++) {
    const product = productsToTest[i]
    log(`\n[${i + 1}/${productsToTest.length}] ${product.reference_product.title}`)
    log(`    ASIN: ${product.reference_product.asin}`)
    log("    " + "-".repeat(70))

    // Process each step
    const steps = [
      { name: "keyword_generation", data: product.pipeline_steps.step1_keyword_generation, num: 1 },
      { name: "candidate_search", data: product.pipeline_steps.step2_candidate_search, num: 2 },
      { name: "apply_filters", data: product.pipeline_steps.step3_apply_filters, num: 3 },
      { name: "llm_relevance_evaluation", data: product.pipeline_steps.step4_llm_relevance_evaluation, num: 4 },
      { name: "rank_and_select", data: product.pipeline_steps.step5_rank_and_select, num: 5 }
    ]

    for (const step of steps) {
      const reasoning = await generateReasoningForStep(step.name, step.data)
      const category = categorizeStep(step.name, step.data.output)
      const notes = extractStepNotes(step.name, step.data)

      testCases.push({
        productTitle: product.reference_product.title,
        productAsin: product.reference_product.asin,
        stepName: step.name,
        stepNumber: step.num,
        input: step.data.input,
        output: step.data.output,
        generatedReasoning: reasoning,
        category,
        notes
      })

      log(`    Step ${step.num}: ${step.name}`)
      log(`        Category: ${category}`)
      log(`        Reasoning: "${reasoning}"`)
      if (notes) log(`        Notes: ${notes}`)
    }
  }

  // Generate report
  log("\n\n" + "=".repeat(80))
  log("📊 REASONING VERIFICATION REPORT")
  log("=".repeat(80) + "\n")

  // Group by step type
  const byStep = new Map<string, ReasoningTestCase[]>()
  testCases.forEach(tc => {
    if (!byStep.has(tc.stepName)) {
      byStep.set(tc.stepName, [])
    }
    byStep.get(tc.stepName)!.push(tc)
  })

  // Report for each step
  byStep.forEach((cases, stepName) => {
    log(`\n📌 ${stepName.toUpperCase()}`)
    log("-".repeat(80))

    // Group by category
    const byCategory = new Map<string, ReasoningTestCase[]>()
    cases.forEach(tc => {
      if (!byCategory.has(tc.category)) {
        byCategory.set(tc.category, [])
      }
      byCategory.get(tc.category)!.push(tc)
    })

    byCategory.forEach((categoryCases, category) => {
      log(`\n  ${category} (${categoryCases.length} cases)`)
      categoryCases.forEach(tc => {
        log(`    • ${tc.productAsin}: "${tc.generatedReasoning}"`)
        if (tc.notes) {
          log(`      └─ ${tc.notes}`)
        }
      })
    })
  })

  // Edge case summary
  log("\n\n" + "=".repeat(80))
  log("🎯 EDGE CASES DETECTED")
  log("=".repeat(80) + "\n")

  const edgeCases = testCases.filter(tc => tc.category.includes("❌") || tc.category.includes("⚠️"))

  if (edgeCases.length === 0) {
    log("No edge cases detected!")
  } else {
    edgeCases.forEach(tc => {
      log(`${tc.category}`)
      log(`  Product: ${tc.productTitle} (${tc.productAsin})`)
      log(`  Step: ${tc.stepName}`)
      log(`  Reasoning: "${tc.generatedReasoning}"`)
      if (tc.notes) log(`  Details: ${tc.notes}`)
      log()
    })
  }

  // Save detailed report to JSON
  const reportPath = path.join(process.cwd(), "reasoning_verification_report.json")
  const report = {
    generated_at: new Date().toISOString(),
    total_products: products.length,
    total_test_cases: testCases.length,
    edge_cases_count: edgeCases.length,
    test_cases: testCases,
    summary_by_step: Array.from(byStep.entries()).map(([stepName, cases]) => ({
      step_name: stepName,
      total_cases: cases.length,
      categories: Array.from(
        new Map(cases.map(c => [c.category, cases.filter(x => x.category === c.category).length]))
      ).map(([category, count]) => ({ category, count }))
    }))
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  log(`\n💾 Detailed JSON report saved to: reasoning_verification_report.json`)

  // Statistics
  log("\n" + "=".repeat(80))
  log("📈 STATISTICS")
  log("=".repeat(80))
  log(`Total products analyzed: ${productsToTest.length}`)
  log(`Total reasoning generated: ${testCases.length}`)
  log(`Edge cases detected: ${edgeCases.length}`)
  log(`Normal cases: ${testCases.length - edgeCases.length}`)
  log()

  // Save text output to file
  const textOutputPath = path.join(process.cwd(), "reasoning_verification_output.txt")
  fs.writeFileSync(textOutputPath, outputLines.join("\n"))
  log(`💾 Text output saved to: reasoning_verification_output.txt`)
  log()
}

main().catch(console.error)
