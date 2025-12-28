type Candidate = {
  asin: string
  title: string
}

export function evaluateCompetitorRelevance(
  referenceTitle: string,
  candidates: Candidate[]
) {
  return candidates.map(candidate => {
    const title = candidate.title.toLowerCase()
//xray fun what to return 
    if (title.includes("lid")) {
      return {
        asin: candidate.asin,
        title: candidate.title,
        is_competitor: false,
        rejection_reason: {
          code: "ACCESSORY",
          explanation: "Product is a replacement lid, not a bottle"
        },
        confidence: 0.98
      }
    }

    if (title.includes("brush")) {
      return {
        asin: candidate.asin,
        title: candidate.title,
        is_competitor: false,
        rejection_reason: {
          code: "ACCESSORY",
          explanation: "Product is a cleaning accessory"
        },
        confidence: 0.97
      }
    }

    if (title.includes("carrier") || title.includes("bag")) {
      return {
        asin: candidate.asin,
        title: candidate.title,
        is_competitor: false,
        rejection_reason: {
          code: "ACCESSORY",
          explanation: "Product is a carrying accessory"
        },
        confidence: 0.96
      }
    }

    return {
      asin: candidate.asin,
      title: candidate.title,
      is_competitor: true,
      confidence: 0.93
    }
  })
}
