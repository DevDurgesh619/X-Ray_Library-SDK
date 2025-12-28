import { XRay } from "@/xRay"
import { generateKeywords } from "./fakeLLM"
import { searchProducts } from "./fakeSearch"
import { evaluateCompetitorRelevance } from "./fakeLLMRelevance"

export function runPipeline(executionId: string) {
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

  const keywords = generateKeywords(referenceProduct.title)

  xray.logStep({
    name: "keyword_generation",
    input: {
      product_title: referenceProduct.title,
      category: referenceProduct.category
    },
    output: {
      keywords,
      model: "fake-gpt-4"
    },
    metadata: {
      reasoning:
        "Extracted material, size, and insulation attributes from title"
    }
  })

  /* -----------------------------
     STEP 2: Candidate Search
  -----------------------------*/
  const search = searchProducts(keywords[0], 50)

  xray.logStep({
    name: "candidate_search",
    input: {
      keyword: keywords[0],
      limit: 50
    },
    output: {
      total_results: search.total_results,
      candidates_fetched: search.candidates_fetched,
      candidates: search.candidates
    },
    metadata: {
      reasoning:
        "Fetched top candidates by keyword relevance"
    }
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

  const passedFilters = evaluations.filter(e => e.qualified)

  xray.logStep({
    name: "apply_filters",
    input: {
      candidates_count: search.candidates.length,
      reference_product: referenceProduct
    },
    output: {
      total_evaluated: evaluations.length,
      passed: passedFilters.length,
      failed: evaluations.length - passedFilters.length,
      evaluations
    },
    metadata: {
      filters_applied: filters,
      reasoning:
        "Applied price, rating, and review count thresholds"
    }
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

  xray.logStep({
    name: "llm_relevance_evaluation",
    input: {
      candidates_count: passedFilters.length,
      reference_product: {
        title: referenceProduct.title,
        category: referenceProduct.category
      },
      model: "fake-gpt-4"
    },
    output: {
      total_evaluated: relevanceEvaluations.length,
      confirmed_competitors: confirmedCandidates.length,
      false_positives_removed:
        relevanceEvaluations.length - confirmedCandidates.length,
      evaluations: relevanceEvaluations
    },
    metadata: {
      reasoning:
        "Removed accessories and non-competitor products using LLM judgment"
    }
  })

  /* -----------------------------
     STEP 5: Rank & Select
  -----------------------------*/
  if (confirmedCandidates.length === 0) {
    xray.logStep({
      name: "rank_and_select",
      input: {
        candidates_count: 0
      },
      output: {
        ranked_candidates: [],
        selection: null
      },
      metadata: {
        reasoning:
          "No candidates remained after numeric filters and LLM relevance evaluation"
      }
    })

    return xray.end({
      decision: "NO_COMPETITOR_FOUND",
      reasoning:
        "All candidates were rejected as non-competitors by the LLM"
    })
  }

  const ranked = confirmedCandidates
    .sort((a, b) => b.reviews - a.reviews)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      llm_confidence: llmApprovalMap.get(item.asin)?.confidence
    }))

  const selected = ranked[0]

  xray.logStep({
    name: "rank_and_select",
    input: {
      candidates_count: ranked.length,
      ranking_criteria: ["review_count", "rating"]
    },
    output: {
      ranked_candidates: ranked,
      selection: {
        asin: selected.asin,
        title: selected.title,
        reason:
          "Highest review count among confirmed competitors"
      }
    },
    metadata: {
      reasoning:
        "Prioritized social proof after LLM relevance filtering"
    }
  })

  return xray.end({
    decision: "COMPETITOR_SELECTED",
    selected_competitor: selected
  })
}
