// llmReasoning.ts
import { Step } from "./step"

export async function generateStepReasoning(step: Step): Promise<string> {
  try {
        if (step.output?.extracted_themes !== undefined) {
        return `Extracted themes: "${step.output.extracted_themes.join(', ')}" from "${step.input?.seed_movie}"`
        }
    // 🔥 Pattern matching for rich reasoning
    if (step.output) {
      // Filter steps (passed/failed counts)
      if (step.output.passed !== undefined && step.output.failed !== undefined) {
        const criteria = []
        if (step.input?.min_rating) criteria.push(`rating ≥ ${step.input.min_rating}`)
        if (step.input?.max_age_years) criteria.push(`age ≤ ${step.input.max_age_years}y`)
        return `Filtered ${step.output.passed} items (dropped ${step.output.failed}) using ${criteria.join(', ')}`
      }
      
      // Search steps (candidates found)
      if (step.output.total_found !== undefined || step.output.candidates_fetched !== undefined) {
        const found = step.output.total_found || step.output.candidates_fetched || 0
        const themes = step.input?.themes?.join(', ') || 'query'
        return `Found ${found} candidates matching "${themes}"`
      }
      
      // Exclusion steps (removed items)
      if (step.output.removed !== undefined && step.output.remaining_candidates !== undefined) {
        return `Removed ${step.output.removed.length} items (${step.output.remaining_candidates} remain)`
      }
      
      // LLM evaluation steps
      if (step.output.confirmed_relevant !== undefined || step.output.confirmed_competitors !== undefined) {
        const accepted = step.output.confirmed_relevant || step.output.confirmed_competitors || 0
        const total = step.output.total_evaluated || step.output.evaluations?.length || 0
        return `Evaluated ${total} items, accepted ${accepted} as relevant`
      }
      
      // Ranking steps
      if (step.output.selection !== undefined) {
        const selected = step.output.selection.movie?.title || step.output.selection.title || 'top item'
        return `Selected "${selected}" from ${step.output.ranked_candidates?.length || 1} ranked options`
      }
    }

    // Fallback
    return `Completed "${step.name}" step (${step.durationMs || 0}ms)`
  } catch (error) {
    return `Completed "${step.name}" (${step.durationMs || 0}ms)`
  }
}
