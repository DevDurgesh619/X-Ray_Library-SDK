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
    const prompt = `You are an AI pipeline observability expert. Generate a concise 1-2 sentence explanation for this step.

Input: ${JSON.stringify(step.input ?? {})}

Output: ${JSON.stringify(step.output ?? {})}

Rules:
- Be specific and mention counts, thresholds, or key decisions
- Use neutral, technical language
- Do NOT restate raw data verbatim
- ONLY return the reasoning text, no JSON formatting

Reasoning:`;

    console.log(`[LLM] 🔧 Initializing OpenAI client...`)
    const client = getOpenAIClient()
    console.log(`[LLM] ✓ OpenAI client initialized`)

    console.log(`[LLM] 📤 Sending request to OpenAI API...`)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
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
