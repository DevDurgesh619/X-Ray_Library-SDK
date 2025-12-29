/**
 * Script to run the competitor selection pipeline using data from comprehensive_products_dataset.json
 * Runs pipeline for specified products and saves XRay execution data to separate JSON files
 */

import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { XRay } from "../src/xRay"
import { saveExecution } from "../src/lib/storage"

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Read the comprehensive dataset
const datasetPath = path.join(process.cwd(), "comprehensive_products_dataset.json")
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"))

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

async function runPipelineForProduct(productData: ProductData, executionId: string) {
  const xray = new XRay(executionId, {
    domain: "competitors",
    pipeline: "competitor-selection-dataset-v1",
    product_asin: productData.reference_product.asin
  })

  console.log(`\n🚀 Running pipeline for: ${productData.reference_product.title}`)
  console.log(`   ASIN: ${productData.reference_product.asin}`)

  // Step 1: Keyword Generation
  console.log("   📝 Step 1: Keyword Generation")
  xray.startStep("keyword_generation", productData.pipeline_steps.step1_keyword_generation.input)
  await xray.endStep("keyword_generation", productData.pipeline_steps.step1_keyword_generation.output)

  // Step 2: Candidate Search
  console.log("   🔍 Step 2: Candidate Search")
  xray.startStep("candidate_search", productData.pipeline_steps.step2_candidate_search.input)
  await xray.endStep("candidate_search", productData.pipeline_steps.step2_candidate_search.output)

  // Step 3: Apply Filters
  console.log("   🎯 Step 3: Apply Filters")
  xray.startStep("apply_filters", productData.pipeline_steps.step3_apply_filters.input)
  await xray.endStep("apply_filters", productData.pipeline_steps.step3_apply_filters.output)

  // Step 4: LLM Relevance Evaluation
  console.log("   🤖 Step 4: LLM Relevance Evaluation")
  xray.startStep("llm_relevance_evaluation", productData.pipeline_steps.step4_llm_relevance_evaluation.input)
  await xray.endStep("llm_relevance_evaluation", productData.pipeline_steps.step4_llm_relevance_evaluation.output)

  // Step 5: Rank and Select
  console.log("   🏆 Step 5: Rank and Select")
  xray.startStep("rank_and_select", productData.pipeline_steps.step5_rank_and_select.input)
  await xray.endStep("rank_and_select", productData.pipeline_steps.step5_rank_and_select.output)

  // End execution
  const execution = xray.end(productData.final_outcome)

  // Save to central storage (required for reasoning queue)
  saveExecution(execution)

  console.log(`   ✅ Pipeline completed for ${productData.reference_product.asin}`)

  return execution
}

function sanitizeFilename(title: string): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50) // Limit length
}

async function main() {
  const products = dataset.products as ProductData[]

  console.log(`📦 Found ${products.length} products in dataset`)
  console.log(`🎯 Running pipeline for first 2 products\n`)

  // Create output directory for execution results
  const outputDir = path.join(process.cwd(), "executions_output")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Run pipeline for first 2 products
  for (let i = 0; i < Math.min(2, products.length); i++) {
    const product = products[i]
    const executionId = `exec-${product.reference_product.asin}-${Date.now()}`

    try {
      const execution = await runPipelineForProduct(product, executionId)

      // Create filename from product title
      const filename = `${sanitizeFilename(product.reference_product.title)}-${product.reference_product.asin}.json`
      const filepath = path.join(outputDir, filename)

      // Save execution to file
      fs.writeFileSync(filepath, JSON.stringify(execution, null, 2))

      console.log(`   💾 Saved execution to: ${filename}\n`)

    } catch (error) {
      console.error(`   ❌ Error processing ${product.reference_product.asin}:`, error)
    }
  }

  console.log(`\n✨ Done! Check the ${outputDir} directory for results.`)
}

// Run the script
main().catch(console.error)
