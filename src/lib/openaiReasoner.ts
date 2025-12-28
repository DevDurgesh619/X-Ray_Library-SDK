// lib/openaiReasoner.ts
import OpenAI from "openai"
import { Step } from "@/xRay/step"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function openaiExplainStep(step: Step): Promise<string> {
  // Fast numeric summaries FIRST (no API cost)
//  const numericReasoning = generateNumericReasoning(step)
//  if (numericReasoning) return numericReasoning

  // Skip if no API key
  if (!process.env.OPENAI_API_KEY) {
    return `✅ ${step.name} processed (${step.durationMs ?? 0}ms)`
  }

  try {
    const prompt = `You are a pipeline observability expert. Explain this step in **ONE short sentence** focusing on what changed:

Step: ${step.name}
Input: ${JSON.stringify(step.input ?? {}, null, 2)}
Output: ${JSON.stringify(step.output ?? {}, null, 2)}
Duration: ${step.durationMs ?? 0}ms

Examples:
"Extracted time manipulation, mind-bending themes from Inception input"
"Filtered 5→2 movies by rating≥7.5 and age≤15y"
"Found 2847 products matching keyword, returned top 8"
"LLM approved 4/6 products as direct competitors"
"Selected HydroFlask (highest reviews) from 4 ranked options"

Be concise, focus on counts/decisions.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // ✅ Cheap + fast ($0.15/1M tokens)
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0.1,
    })

    return completion.choices[0]?.message?.content?.trim() || "Step processed"
  } catch (error: any) {
    console.warn("OpenAI failed:", error.message)
    return generateNumericReasoning(step) || `✅ ${step.name} processed`
  }
}

function generateNumericReasoning(step: Step): string | null {
  const input = step.input ?? {}
  const output = step.output ?? {}

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

  // Size change
  const inputCount = getArrayLength(input)
  const outputCount = getArrayLength(output)
  if (inputCount && outputCount && inputCount !== outputCount) {
    return `🔄 ${inputCount}→${outputCount} items`
  }

  return null
}

function getArrayLength(obj: any): number | null {
  if (Array.isArray(obj)) return obj.length
  return obj?.candidates?.length ?? obj?.items?.length ?? obj?.remaining?.length ?? null
}
