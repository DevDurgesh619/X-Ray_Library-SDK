// llmReasoning.ts
import { grokExplainStep } from "./grokReasoner"
import { Step } from "./step"

function isNumber(x: any): x is number {
  return typeof x === "number" && !Number.isNaN(x)
}

function asCount(value: any): number | null {
  if (isNumber(value)) return value
  if (Array.isArray(value)) return value.length
  return null
}

function getSelectionLabel(selection: any): string {
  if (!selection || typeof selection !== "object") return "one item"
  if (typeof selection.label === "string") return selection.label
  const nested = selection.item ?? selection.entity ?? selection.target ?? selection.movie ?? selection.product
  if (nested && typeof nested === "object") {
    if (typeof nested.title === "string") return nested.title
    if (typeof nested.name === "string") return nested.name
    if (typeof nested.id === "string") return nested.id
  }
  if (typeof selection.title === "string") return selection.title
  if (typeof selection.name === "string") return selection.name
  if (typeof selection.id === "string") return selection.id
  if (typeof selection.asin === "string") return selection.asin
  return "one item"
}

export async function generateStepReasoning(step: Step): Promise<string> {
  try {
    const input = step.input ?? {}
    const output = step.output ?? {}

    // 0) Error steps
    if (step.error) {
      return `Step "${step.name}" failed after ${step.durationMs ?? 0}ms with error: ${step.error}`
    }

    // 🔥 1) RICH FILTER DETECTION (MOVIE + COMPETITOR)
    if (step.name === "apply_filters") {
      // Check for explicit counts first
      const totalEvaluated = asCount(output.total_evaluated) ?? asCount(output.evaluated)
      const passed = asCount(output.passed)
      const failed = asCount(output.failed)
      
      if (totalEvaluated !== null && passed !== null) {
        // Try to detect filter names from input
        const filters = input.filters_applied ?? input
        const filterKeys = Object.keys(filters).filter(k => 
          k.includes('rating') || k.includes('price') || k.includes('review') || 
          k.includes('age') || k.includes('year') || k.includes('score')
        )
        const filterText = filterKeys.length 
          ? filterKeys.map(k => k.replace(/_/g, ' ')).join(', ')
          : 'filters'
        return `Applied ${filterText} → ${passed}/${totalEvaluated} passed (${failed ?? totalEvaluated - passed} failed)`
      }
    }

    // 2) PREFERENCE UNDERSTANDING / KEYWORD GENERATION (themes/keywords output)
    if ((step.name === "preference_understanding" || step.name === "keyword_generation") && 
        (output.extracted_themes || output.keywords)) {
      const themes = output.extracted_themes?.join(', ') ?? output.keywords?.join(', ') ?? 'themes'
      const seed = input.seed_movie ?? input.product_title ?? input.title ?? 'input'
      return `Extracted "${themes}" from "${seed}"`
    }

    // 3) Explicit evaluation counts
    const totalEvaluated = asCount(output.total_evaluated) ?? asCount(output.totalEvaluated) ?? asCount(output.evaluated)
    const passed = asCount(output.passed) ?? asCount(output.accepted)
    const failed = asCount(output.failed) ?? asCount(output.rejected)

    if (totalEvaluated !== null && (passed !== null || failed !== null)) {
      const p = passed ?? (totalEvaluated - (failed ?? 0))
      const f = failed ?? (totalEvaluated - p)
      return `Evaluated ${totalEvaluated} items: ${p} passed, ${f} failed`
    }

    // 4) Search / retrieval
    const totalResults = asCount(output.total_results) ?? asCount(output.total_found) ?? asCount(output.total)
    const fetched = asCount(output.candidates_fetched) ?? asCount(output.returned) ?? asCount(output.candidates)

    if (totalResults !== null && fetched !== null) {
      const query = input.keyword ?? input.query ?? 
        (Array.isArray(input.themes) ? input.themes.join(', ') : undefined) ??
        (Array.isArray(input.keywords) ? input.keywords.join(', ') : undefined) ??
        'query'
      return `Found ${totalResults} results for "${query}", returned ${fetched}`
    }

    // 5) Filter-like size change (input candidates → output remaining)
        const inputCandidates = asCount(input.candidates_count) ?? asCount(input.candidates)  // ✅ Fixed duplicate
        const outputRemaining = asCount(output.remaining) ?? asCount(output.filtered) ?? asCount(output.passed)

        if (inputCandidates !== null && outputRemaining !== null && inputCandidates !== outputRemaining) {
        return `Filtered ${inputCandidates} candidates down to ${outputRemaining}`
        }


    // 6) Evaluation array
    if (Array.isArray(output.evaluations)) {
      const evals = output.evaluations
      const accepted = evals.filter((e: any) => 
        e.is_relevant === true || e.is_competitor === true || e.passed === true || e.ok === true
      )
      const rejected = evals.filter((e: any) => 
        e.is_relevant === false || e.is_competitor === false || e.passed === false || e.ok === false
      )
      return `Evaluated ${evals.length} candidates: ${accepted.length} accepted, ${rejected.length} rejected`
    }

    // 7) Selection / ranking
    if (output.selection) {
      const title = getSelectionLabel(output.selection)
      const rankedCount = asCount(output.ranked_candidates) ?? asCount(output.rankedItems) ?? 1
      return `Selected "${title}" as top choice from ${rankedCount} candidate(s)`
    }

    // 8) Generic size change
    const inSize = asCount(input.items) ?? asCount(input.rows) ?? (Array.isArray(input) ? input.length : null)
    const outSize = asCount(output.items) ?? asCount(output.rows) ?? (Array.isArray(output) ? output.length : null)

    if (inSize !== null && outSize !== null && inSize !== outSize) {
      return `Transformed ${inSize} items into ${outSize} items`
    }

    // 9) Final fallback
    const llm = await grokExplainStep(step)
    return llm || `Completed "${step.name}" step in ${step.durationMs ?? 0}ms`
  } catch {
    return `Completed "${step.name}" step in ${step.durationMs ?? 0}ms`
  }
}
