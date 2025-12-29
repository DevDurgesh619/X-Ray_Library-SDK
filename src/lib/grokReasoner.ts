// lib/grokReasoner.ts
import OpenAI from "openai"
import { Step } from "@/xRay/step"

let grok: OpenAI | null = null

function getGrokClient(): OpenAI {
  if (!grok) {
    grok = new OpenAI({
      apiKey: process.env.GROK_API_KEY!,
      baseURL: "https://api.x.ai/v1",
    })
  }
  return grok
}

export async function grokExplainStep(step: Step): Promise<string> {
  try {
    const client = getGrokClient()
    const prompt = `You are a senior pipeline observability engineer. Analyze this step and explain **exactly what happened** in ONE short sentence.

Step name: ${step.name}
Input: ${JSON.stringify(step.input ?? {}, null, 2)}
Output: ${JSON.stringify(step.output ?? {}, null, 2)}
Duration: ${step.durationMs ?? 0}ms

Rules:
- Focus on COUNTS (filtered X→Y, evaluated Z, selected top 1)
- Mention key decisions (themes extracted, items rejected)
- Use step name if relevant
- Keep it concise (under 80 chars)
- Never say "successfully" or "completed"

Examples:
- "Extracted time manipulation, mind-bending themes from Inception"
- "Filtered 5→2 movies (rating≥7.5, age≤15y)" 
- "Found 2847 products, returned top 8"
`

    const completion = await client.chat.completions.create({
      model: "grok-beta",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0.1,
    })

    return completion.choices[0]?.message?.content?.trim() || "Step processed"
  } catch (error) {
    console.warn("Grok API failed:", error)
    return "Step processed"
  }
}
