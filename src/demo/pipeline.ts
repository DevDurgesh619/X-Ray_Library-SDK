import { XRay } from "@/xRay"
import { generateKeywords } from "./fakeLLM"
import { searchProducts } from "./fakeSearch"
import { evaluateCompetitorRelevance } from "./fakeLLMRelevance"

export async function runPipeline(executionId: string) {
  const xray = new XRay(executionId, {
    pipeline: "competitor-selection-v2"
  })

  /* -----------------------------
     STEP 1: Keyword Generation
  -----------------------------*/
  const referenceProduct = {
    asin: "B0XYZ123",
    title: "Stainless Steel Water Bottle 32oz Insulated",
    price: 25.0,  
    rating: 4.2,
    reviews: 1247,
    category: "Sports & Outdoors > Water Bottles"
  }

  xray.startStep("keyword_generation", {
    product_title: referenceProduct.title,
    category: referenceProduct.category
  })

  const keywords = generateKeywords(referenceProduct.title)

  await xray.endStep("keyword_generation", {
    keywords,
    model: "fake-gpt-4"
    // generic reasoning may just be a simple fallback here
  })

  /* -----------------------------
     STEP 2: Candidate Search
  -----------------------------*/
  xray.startStep("candidate_search", {
    keyword: keywords[0],
    limit: 50
  })

  const search = searchProducts(keywords[0], 50)

  await xray.endStep("candidate_search", {
    total_results: search.total_results,
    candidates_fetched: search.candidates_fetched,
    candidates: search.candidates
    // llmReasoning.ts generic rule:
    // "Found 2847 results for 'stainless steel water bottle insulated', returned 8"
  })

  /* -----------------------------
     STEP 3: Apply Numeric Filters
  -----------------------------*/
  const filters = {
    priceRange: {
      min: referenceProduct.price * 0.5,
      max: referenceProduct.price * 2
    },
    minRating: 3.8,
    minReviews: 100
  }

  const evaluations = search.candidates.map(candidate => {
    const filterResults = {
      price_range: {
        passed:
          candidate.price >= filters.priceRange.min &&
          candidate.price <= filters.priceRange.max,
        detail: `$${candidate.price} vs $${filters.priceRange.min}-${filters.priceRange.max}`
      },
      min_rating: {
        passed: candidate.rating >= filters.minRating,
        detail: `${candidate.rating} vs ${filters.minRating}`
      },
      min_reviews: {
        passed: candidate.reviews >= filters.minReviews,
        detail: `${candidate.reviews} vs ${filters.minReviews}`
      }
    }

    const qualified =
      filterResults.price_range.passed &&
      filterResults.min_rating.passed &&
      filterResults.min_reviews.passed

    return {
      ...candidate,
      filter_results: filterResults,
      qualified
    }
  })

    xray.startStep("apply_filters", {
    candidates_count: search.candidates.length,
    reference_product: referenceProduct,
    filters_applied: filters
  })

  const passedFilters = evaluations.filter(e => e.qualified)



  await xray.endStep("apply_filters", {
    total_evaluated: evaluations.length,
    passed: passedFilters.length,
    failed: evaluations.length - passedFilters.length,
    evaluations
    // llmReasoning.ts generic rules can say, e.g.:
    // "Evaluated 8 items: 6 passed, 2 failed"
    // or richer: "Applied price, rating/score, review count filters to narrow candidates from 8 to 6"
  })

  /* -----------------------------
     STEP 4: LLM Relevance Evaluation
  -----------------------------*/
  const relevanceEvaluations = evaluateCompetitorRelevance(
    referenceProduct.title,
    passedFilters
  )

  const llmApprovalMap = new Map(
    relevanceEvaluations
      .filter(r => r.is_competitor)
      .map(r => [r.asin, r])
  )

  const confirmedCandidates = passedFilters.filter(candidate =>
    llmApprovalMap.has(candidate.asin)
  )

  xray.startStep("llm_relevance_evaluation", {
    candidates_count: passedFilters.length,
    reference_product: {
      title: referenceProduct.title,
      category: referenceProduct.category
    },
    model: "fake-gpt-4"
  })

  await xray.endStep("llm_relevance_evaluation", {
    total_evaluated: relevanceEvaluations.length,
    confirmed_competitors: confirmedCandidates.length,
    false_positives_removed:
      relevanceEvaluations.length - confirmedCandidates.length,
    evaluations: relevanceEvaluations
    // generic rule: "Evaluated 6 candidates: 4 accepted, 2 rejected"
  })

  /* -----------------------------
     STEP 5: Rank & Select
  -----------------------------*/
  xray.startStep("rank_and_select", {
    candidates_count: confirmedCandidates.length,
    ranking_criteria: ["review_count", "rating"]
  })

  if (confirmedCandidates.length === 0) {
    await xray.endStep("rank_and_select", {
      ranked_candidates: [],
      selection: null
    })

    const execution = xray.end({
      decision: "NO_COMPETITOR_FOUND",
      reasoning:
        "All candidates were rejected as non-competitors by the LLM"
    })

    return { execution, xray }
  }

  const ranked = confirmedCandidates
    .sort((a, b) => b.reviews - a.reviews)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      llm_confidence: llmApprovalMap.get(item.asin)?.confidence
    }))

  const selected = ranked[0]

  await xray.endStep("rank_and_select", {
    ranked_candidates: ranked,
    selection: {
      asin: selected.asin,
      title: selected.title
      // no natural-language "reason" here
    }
    // llmReasoning.ts selection rule (using a generic helper) will produce:
    // 'Selected "HydroFlask 32oz Wide Mouth Insulated Bottle" as top choice from 4 candidate(s)'
  })

  const execution = xray.end({
    decision: "COMPETITOR_SELECTED",
    selected_competitor: selected
  })

  return { execution, xray }
}
