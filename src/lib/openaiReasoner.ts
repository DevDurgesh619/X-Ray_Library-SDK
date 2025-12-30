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

  // Skip if no API key
  if (!process.env.OPENAI_API_KEY) {
    console.log(`[LLM] ⚠️  No OPENAI_API_KEY found, returning fallback`)
    return `✅ ${step.name} processed (${step.durationMs ?? 0}ms)`
  }
  console.log(`[LLM] ✓ OPENAI_API_KEY found`)

  try {
   const prompt = `You are an AI pipeline observability and explainability expert specializing in multi-stage data processing pipelines.

## TASK
Generate a clear, structured reasoning explanation for a single pipeline step that describes:
- WHAT the step accomplished (the transformation or decision made)
- WHY it was necessary (the step's purpose in the pipeline)
- HOW the data changed (specific counts, metrics, or key decisions)

## STEP CONTEXT
Step Name: ${step.name}

Input:
${JSON.stringify(step.input ?? {}, null, 2)}

Output:
${JSON.stringify(step.output ?? {}, null, 2)}

## RULES
1. **Length**: 1-2 concise sentences maximum
2. **Specificity**: Always mention concrete numbers (counts, thresholds, percentages, scores)
3. **Accuracy**: Only reference data present in input/output - no assumptions or hallucinations
4. **Clarity**: Use neutral, technical language suitable for debugging logs
5. **Format**: Return ONLY the reasoning text (no JSON, no code fences, no labels)
6. **Focus**: Explain the transformation, not just describe the data

## STEP TYPE PATTERNS & EXAMPLES

### 1. KEYWORD/QUERY GENERATION
Purpose: Extract search terms or attributes from product/item data
Key metrics: Number of keywords generated, model used
Example:
Input: { "product_title": "Stainless Steel Water Bottle 32oz", "category": "Sports" }
Output: { "keywords": ["stainless steel water bottle", "insulated bottle 32oz"], "model": "gpt-4" }
✅ GOOD: "Generated 2 search keywords from product title and category using gpt-4 to capture core product attributes and common search patterns"
❌ BAD: "The step extracted keywords from the input and returned them in the output"

### 2. CANDIDATE SEARCH
Purpose: Retrieve candidates from a search index or database
Key metrics: Total results found vs. candidates fetched/returned
Example:
Input: { "keyword": "insulated water bottle", "limit": 50 }
Output: { "total_results": 2847, "candidates_fetched": 10, "candidates": [...] }
✅ GOOD: "Search found 2,847 total matches for the keyword query but retrieved only the top 10 candidates to optimize processing efficiency"
❌ BAD: "The search returned 10 candidates from 2847 results"

### 3. FILTERING
Purpose: Apply numeric or rule-based criteria to narrow candidates
Key metrics: Total evaluated, passed, failed counts; specific filter thresholds
Example:
Input: { "candidates_count": 10, "filters_applied": { "minRating": 4.0, "minReviews": 100 } }
Output: { "total_evaluated": 10, "passed": 6, "failed": 4, "evaluations": [...] }
✅ GOOD: "Applied rating (≥4.0) and review count (≥100) filters to 10 candidates, with 6 passing and 4 failing due to insufficient ratings or review volume"
❌ BAD: "Filtered 10 candidates down to 6 based on the criteria"

### 4. LLM RELEVANCE EVALUATION
Purpose: Use AI to validate semantic relevance and remove false positives
Key metrics: Total evaluated, confirmed competitors, false positives removed, confidence scores
Example:
Input: { "candidates_count": 6, "reference_product": { "title": "Steel Water Bottle" }, "model": "gpt-4" }
Output: { "total_evaluated": 6, "confirmed_competitors": 4, "false_positives_removed": 2, "evaluations": [...] }
✅ GOOD: "LLM evaluation (gpt-4) confirmed 4 of 6 candidates as true competitors, removing 2 false positives (e.g., accessories or incompatible categories) based on semantic relevance analysis"
❌ BAD: "The LLM checked 6 items and found 4 were competitors and removed 2"

### 5. RANKING & SELECTION
Purpose: Score and rank candidates, then select the best match
Key metrics: Number ranked, ranking criteria used, selected item details
Example:
Input: { "candidates_count": 4, "ranking_criteria": ["review_count", "rating"] }
Output: { "ranked_candidates": [{ "rank": 1, "asin": "B001", "title": "HydroFlask", "rating": 4.5, "reviews": 8932 }], "selection": { "asin": "B001" } }
✅ GOOD: "Ranked 4 candidates by review count and rating, selecting HydroFlask (4.5★, 8,932 reviews) as the top choice due to highest engagement metrics"
❌ BAD: "Ranked the candidates and selected HydroFlask as the best one"

### 6. PREFERENCE UNDERSTANDING / ATTRIBUTE EXTRACTION
Purpose: Analyze user preferences or item attributes to guide downstream steps
Key metrics: Attributes extracted, themes identified, model used
Example:
Input: { "seed_movie": "The Matrix", "user_preferences": "action sci-fi" }
Output: { "themes": ["dystopian future", "AI rebellion", "philosophical"], "genres": ["Action", "Sci-Fi"], "model": "gpt-4" }
✅ GOOD: "Analyzed seed movie 'The Matrix' using gpt-4 to extract 3 core themes (dystopian future, AI rebellion, philosophical) and 2 primary genres for downstream candidate matching"
❌ BAD: "Extracted themes and genres from the input movie"

## COMMON PITFALLS TO AVOID
- ❌ Restating raw data: "Input had 10 items, output had 6 items"
- ❌ Missing metrics: "Filtered some candidates based on criteria"
- ❌ Vague language: "Processed the data successfully"
- ❌ Over-explaining: Long paragraphs with unnecessary details
- ❌ JSON formatting: { "reasoning": "..." } (return text only)

## OUTPUT FORMAT
Return ONLY the reasoning text with no labels, no JSON structure, no code fences.

Generate the reasoning now:`;

    console.log(`[LLM] 🔧 Initializing OpenAI client...`)
    const client = getOpenAIClient()
    console.log(`[LLM] ✓ OpenAI client initialized`)

    console.log(`[LLM] 📤 Sending request to OpenAI API...`)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.1,
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
