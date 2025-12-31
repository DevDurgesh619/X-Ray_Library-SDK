// lib/openaiReasoner.ts
import OpenAI from "openai"
import { Step } from "@/xRay/step"

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openai
}

export async function openaiExplainStep(step: Step): Promise<string> {
  console.log(`[LLM] 🚀 Starting reasoning generation for step: ${step.name}`)

  // Fast numeric summaries FIRST (no API cost)
  const numericReasoning = generateNumericReasoning(step)
    if (numericReasoning) {
       console.log(`[LLM] ✓ Using numeric reasoning: "${numericReasoning}"`)
      return numericReasoning
  }

  // Skip if no server API key
  if (!process.env.OPENAI_API_KEY) {
    console.log(`[LLM] ⚠️  No server OPENAI_API_KEY found, returning fallback`)
    return `✅ ${step.name} processed (${step.durationMs ?? 0}ms)`
  }

  console.log(`[LLM] ✓ Using server's OPENAI_API_KEY`)

  try {
   const prompt = `You are analyzing a pipeline step to answer: "Why did the system make this decision?"

## YOUR GOAL
Provide a SHORT, ACTIONABLE explanation that helps developers DEBUG issues by answering:
1. WHY did this step produce this output? (the decision rationale)
2. WHAT key metrics or thresholds drove the decision?
3. If something looks wrong, WHAT would explain it?

## STEP DATA
Step: ${step.name}

Input:
${JSON.stringify(step.input ?? {}, null, 2)}

Output:
${JSON.stringify(step.output ?? {}, null, 2)}

## RESPONSE RULES
- Length: 1 SHORT sentence (15-25 words max)
- Focus: Answer "WHY this decision?" not "what happened?"
- Include: Specific numbers (counts, thresholds, percentages)
- Causality: Explain cause → effect relationships
- Debug-friendly: Mention what might be wrong if numbers look suspicious
- Format: Plain text only (no JSON, no labels, no code fences)

## EXAMPLES

### Filtering Step
Input: { candidates: 10, filters: { minRating: 4.0, minReviews: 100 } }
Output: { passed: 3, failed: 7, evaluations: [...] }
✅ "Only 3/10 candidates met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews"
❌ "Filtered 10 candidates down to 3 using the provided criteria"

### Search Step
Input: { keyword: "water bottle", limit: 50 }
Output: { total_results: 2847, candidates_fetched: 10 }
✅ "Limited to 10 candidates despite 2,847 matches to prevent overwhelming downstream LLM evaluation"
❌ "The search returned 10 candidates from a total of 2,847 results"

### LLM Evaluation
Input: { candidates: 6, reference_product: "Steel Bottle" }
Output: { confirmed: 4, false_positives: 2, rejected_reasons: ["not water bottle", "accessory"] }
✅ "Rejected 2/6 as false positives (accessories/wrong category) using semantic analysis of title+description"
❌ "The LLM evaluated 6 candidates and confirmed 4 were competitors"

### Ranking & Selection
Input: { candidates: 5, criteria: ["review_count", "rating"] }
Output: { selected: { title: "HydroFlask", rating: 4.7, reviews: 12000 } }
✅ "Selected HydroFlask (4.7★, 12K reviews) because highest review_count×rating score among 5 candidates"
❌ "Ranked 5 candidates and selected HydroFlask as the top result"

### Data Validation
Input: { records: 1000 }
Output: { valid: 980, invalid: 20, error_types: ["missing_field", "invalid_format"] }
✅ "Rejected 20/1000 records (2%) due to missing required fields or malformed data"
❌ "Validated 1000 records and found 980 valid ones"

### Transformation
Input: { raw_data: [...], format: "xml" }
Output: { normalized: 500, format: "json" }
✅ "Converted 500 XML records to JSON format for downstream processing compatibility"
❌ "Transformed the data from XML to JSON format"

## KEY PRINCIPLES
1. CAUSALITY: Explain WHY the numbers are what they are
2. THRESHOLDS: Always mention decision criteria (e.g., "≥4.0 rating", "top 10")
3. TRADE-OFFS: Explain why system chose this over alternatives (e.g., "to prevent overload", "optimize for quality")
4. DEBUG CLUES: If output seems unexpected, explain what caused it
5. NO FLUFF: Every word should add information

Generate reasoning now:`;

    console.log(`[LLM] 🔧 Initializing OpenAI client...`)
    const client = getOpenAIClient()
    console.log(`[LLM] ✓ OpenAI client initialized`)

    console.log(`[LLM] 📤 Sending request to OpenAI API...`)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80, // Increased to ensure complete short sentences (15-25 words)
      temperature: 0.1, // Low temperature for consistent, factual reasoning
    })
    console.log(`[LLM] ✓ Received response from OpenAI API`)

    const rawResponse = completion.choices[0]?.message?.content?.trim() || "Step processed"
    console.log(`[LLM] 📝 Raw response (${rawResponse.length} chars): "${rawResponse}"`)

    // Clean up the response
    let reasoning = rawResponse
      .replace(/^Reasoning:\s*/i, '') // Remove "Reasoning:" prefix if present
      .replace(/```json\s*/g, '')      // Remove JSON code fences
      .replace(/```\s*/g, '')
      .trim()

    // If response looks like truncated JSON, return fallback
    if (reasoning.startsWith('{') && !reasoning.endsWith('}')) {
      console.log(`[LLM] ⚠️  Detected truncated JSON response, using fallback`)
      const fallback = generateNumericReasoning(step) || `Processed ${step.name}`
      console.log(`[LLM] ✓ Using fallback: "${fallback}"`)
      return fallback
    }

    console.log(`[LLM] ✅ Final reasoning (${reasoning.length} chars): "${reasoning}"`)
    return reasoning
  } catch (error: any) {
    console.error(`[LLM] ❌ OpenAI API failed for step ${step.name}:`, error.message)
    console.error(`[LLM] ❌ Error details:`, error)
    console.log(`[LLM] 🔄 Falling back to numeric reasoning...`)

    const fallback = generateNumericReasoning(step) || `✅ ${step.name} processed`
    console.log(`[LLM] ✓ Using fallback: "${fallback}"`)
    return fallback
  }
}

function generateNumericReasoning(step: Step): string | null {
  const input = step.input ?? {}
  const output = step.output ?? {}

  // Ranking/Selection steps (rank_and_select)
  if (output.ranked_candidates && output.selection) {
    const count = output.ranked_candidates?.length ?? 0
    const selectionTitle = output.selection?.title ?? output.selection?.asin ?? 'top choice'
    return `Ranked ${count} candidate(s) and selected "${selectionTitle}" as top choice`
  }

  // Filter pass/fail
  const total = output.total_evaluated ?? output.total_evaluated ?? output.evaluated?.length
  const passed = output.passed ?? output.accepted ?? output.remaining?.length
  if (total && passed !== undefined) {
    return `📊 ${passed}/${total} passed`
  }

  // Search results
  const found = output.total_results ?? output.total_found ?? output.total
  const returned = output.candidates_fetched ?? output.candidates?.length
  if (found && returned) {
    return `🔍 ${found}→${returned} results`
  }

  // Size change (only if different)
  const inputCount = getArrayLength(input)
  const outputCount = getArrayLength(output)
  if (inputCount && outputCount && inputCount !== outputCount) {
    return `🔄 ${inputCount}→${outputCount} items`
  }

  return null
}

function getArrayLength(obj: any): number | null {
  if (Array.isArray(obj)) return obj.length
  return obj?.candidates?.length ?? obj?.items?.length ?? obj?.remaining?.length ?? obj?.ranked_candidates?.length ?? null
}
