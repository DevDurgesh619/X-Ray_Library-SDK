// grokReasoner.ts (optional)
import OpenAI from "openai"
import { Step } from "./step"

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.GROK_API_KEY || ""
})

export async function grokExplainStep(step: Step): Promise<string> {
  const safeStep = {
    name: step.name,
    input: step.input,
    output: step.output,
    error: step.error,
    durationMs: step.durationMs
  }

  const prompt = `
You are an observability assistant for arbitrary multi-step pipelines (data processing, recommendation, lead scoring, etc.).
Given the JSON of a single step, write ONE concise sentence explaining what this step did, focusing on quantities and effects.

JSON:
${JSON.stringify(safeStep, null, 2)}
`

  const res = await grok.chat.completions.create({
    model: "grok-beta",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 80,
    temperature: 0.2
  })

  return res.choices[0]?.message?.content?.trim() || ""
}
