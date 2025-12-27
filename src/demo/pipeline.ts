import { XRay } from "@/xRay"
import { generateKeywords } from "./fakeLLM"
import { searchProducts } from "./fakeSearch"

export function runPipeline(executionId: string) {
  // Create X-Ray execution
  const xray = new XRay(executionId, {
    pipeline: "product-matching-v1"
  })

  /* ---------------------------------
     STEP 1: Keyword generation
  ----------------------------------*/
  const title = "Steel Water Bottle"

  const keywords = generateKeywords(title)

  xray.logStep({
    name: "keyword_generation",
    input: {
      title
    },
    output: {
      keywords,
      reasoning: "Extracted meaningful product keywords from the title"
    }
  })

  /* ---------------------------------
     STEP 2: Candidate search
  ----------------------------------*/
  const searchResult = searchProducts(keywords)

  const candidates = searchResult.results

  xray.logStep({
    name: "candidate_search",
    input: {
      keywords
    },
    output: {
      candidates,
      reasoning: searchResult.reasoning
    }
  })

  /* ---------------------------------
     STEP 3: Apply filters
  ----------------------------------*/
  const rules = {
    minRating: 4,
    maxPrice: 50
  }

  const filteredCandidates = candidates.filter(
    (product) =>
      product.rating >= rules.minRating &&
      product.price <= rules.maxPrice
  )

  xray.logStep({
    name: "apply_filters",
    input: {
      candidates,
      rules
    },
    output: {
      filteredCandidates,
      reasoning:
        "Removed products with rating below 4 or price above 50"
    }
  })

  /* ---------------------------------
     FINAL DECISION
  ----------------------------------*/
  const decision =
    filteredCandidates.length > 0 ? "SHOW_RESULTS" : "NO_MATCHES"

  return xray.end({
    decision,
    reasoning:
      decision === "SHOW_RESULTS"
        ? "At least one product satisfied all filter criteria"
        : "No products passed the applied filters"
  })
}
