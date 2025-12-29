# Prompt for Generating Comprehensive Dummy Product Dataset

Generate a comprehensive JSON file containing 20+ reference products with their complete competitor selection pipeline data. This dataset should showcase various edge cases where different pipeline steps might fail or succeed in interesting ways.

## Context

This data is for an X-Ray pipeline observability system that tracks competitor product selection. The pipeline has 5 steps:
1. **keyword_generation** - Extract search keywords from product title
2. **candidate_search** - Find potential competitor products
3. **apply_filters** - Apply price/rating/review filters
4. **llm_relevance_evaluation** - Remove false positives (accessories, bundles)
5. **rank_and_select** - Pick the best competitor

## Required Data Structure

Generate a JSON array with 20+ objects, each representing a complete reference product with all pipeline execution data. Use this exact structure:

```json
[
  {
    "reference_product": {
      "asin": "B0REF001",
      "title": "Product Title Here",
      "price": 29.99,
      "rating": 4.2,
      "reviews": 1247,
      "category": "Category > Subcategory"
    },
    "pipeline_steps": {
      "step1_keyword_generation": {
        "input": {
          "product_title": "Product Title Here",
          "category": "Category > Subcategory"
        },
        "output": {
          "keywords": ["keyword 1", "keyword 2", "keyword 3"],
          "model": "fake-gpt-4"
        }
      },
      "step2_candidate_search": {
        "input": {
          "keyword": "primary keyword used",
          "limit": 50
        },
        "output": {
          "total_results": 2847,
          "candidates_fetched": 8,
          "candidates": [
            {
              "asin": "B0CAND001",
              "title": "Competitor Product Title",
              "price": 34.99,
              "rating": 4.5,
              "reviews": 8932
            }
            // ... more candidates
          ]
        }
      },
      "step3_apply_filters": {
        "input": {
          "candidates_count": 8,
          "reference_product": {
            "asin": "B0REF001",
            "title": "Product Title",
            "price": 29.99,
            "rating": 4.2,
            "reviews": 1247
          },
          "filters_applied": {
            "priceRange": {
              "min": 14.99,
              "max": 59.98
            },
            "minRating": 3.8,
            "minReviews": 100
          }
        },
        "output": {
          "total_evaluated": 8,
          "passed": 4,
          "failed": 4,
          "evaluations": [
            {
              "asin": "B0CAND001",
              "title": "Competitor Product",
              "price": 34.99,
              "rating": 4.5,
              "reviews": 8932,
              "filter_results": {
                "price_range": {
                  "passed": true,
                  "detail": "$34.99 vs $14.99-$59.98"
                },
                "min_rating": {
                  "passed": true,
                  "detail": "4.5 vs 3.8"
                },
                "min_reviews": {
                  "passed": true,
                  "detail": "8932 vs 100"
                }
              },
              "qualified": true
            }
            // ... more evaluations
          ]
        }
      },
      "step4_llm_relevance_evaluation": {
        "input": {
          "candidates_count": 4,
          "reference_product": {
            "title": "Product Title",
            "category": "Category > Subcategory"
          },
          "model": "fake-gpt-4"
        },
        "output": {
          "total_evaluated": 4,
          "confirmed_competitors": 2,
          "false_positives_removed": 2,
          "evaluations": [
            {
              "asin": "B0CAND001",
              "title": "True Competitor",
              "is_competitor": true,
              "confidence": 0.93
            },
            {
              "asin": "B0CAND005",
              "title": "Replacement Lid",
              "is_competitor": false,
              "rejection_reason": {
                "code": "ACCESSORY",
                "explanation": "Product is a replacement part"
              },
              "confidence": 0.98
            }
            // ... more evaluations
          ]
        }
      },
      "step5_rank_and_select": {
        "input": {
          "candidates_count": 2,
          "ranking_criteria": ["review_count", "rating"]
        },
        "output": {
          "ranked_candidates": [
            {
              "rank": 1,
              "asin": "B0CAND001",
              "title": "Selected Competitor",
              "price": 34.99,
              "rating": 4.5,
              "reviews": 8932,
              "llm_confidence": 0.93
            }
            // ... more ranked
          ],
          "selection": {
            "asin": "B0CAND001",
            "title": "Selected Competitor"
          }
        }
      }
    },
    "final_outcome": {
      "decision": "COMPETITOR_SELECTED",
      "selected_competitor": {
        "asin": "B0CAND001",
        "title": "Selected Competitor",
        "price": 34.99,
        "rating": 4.5,
        "reviews": 8932,
        "qualified": true,
        "llm_confidence": 0.93
      }
    }
  }
  // ... 19+ more reference products
]
```

## Edge Cases to Cover (MANDATORY - Include At Least One of Each)

### Reference Product Categories (20+ products total across these):

1. **Water Bottles** (3 products)
   - Premium stainless steel ($40-50 range)
   - Budget plastic ($10-15 range)
   - Mid-range insulated ($25-35 range)

2. **Wireless Earbuds** (3 products)
   - Premium brand (Apple/Sony competitor level)
   - Budget Chi-Fi brand
   - Gaming-focused earbuds

3. **Phone Cases** (2 products)
   - Rugged protective case
   - Slim leather case

4. **Laptop Backpacks** (2 products)
   - Business/professional backpack
   - Outdoor/hiking backpack with laptop compartment

5. **Kitchen Knives** (2 products)
   - Chef's knife set
   - Single premium chef knife

6. **Yoga Mats** (2 products)
   - Extra thick cushioned
   - Thin travel mat

7. **Desk Lamps** (2 products)
   - LED architect lamp
   - Smart lamp with app control

8. **Running Shoes** (2 products)
   - Marathon/long-distance shoes
   - Trail running shoes

9. **Coffee Makers** (2 products)
   - Pour-over coffee maker
   - Automatic drip machine

10. **Power Banks** (2 products)
    - High-capacity 30,000mAh
    - Slim portable 10,000mAh

### Pipeline Failure/Edge Cases Per Step:

#### Step 1: Keyword Generation Issues
- **Case A**: Generic product title that generates overly broad keywords
  - Example: "Water Bottle" → returns too many unrelated products
- **Case B**: Product with brand name that shouldn't be in keywords
  - Example: "Nike Running Shoes" → keywords should focus on features, not brand
- **Case C**: Multi-function product with ambiguous keywords
  - Example: "Travel Mug with Phone Holder" → which aspect to prioritize?

#### Step 2: Candidate Search Issues
- **Case D**: Very few results (< 5 candidates found)
  - Example: Niche product category with limited competition
- **Case E**: Massive result set with highly varied products
  - Example: Generic term returns 10,000+ results with accessories mixed in
- **Case F**: Search returns mostly accessories/related items, few actual competitors
  - Example: Searching "iPhone case" returns chargers, screen protectors, stands

#### Step 3: Filter Application Issues
- **Case G**: All candidates fail filters (0 passed)
  - Example: Budget product ($8) has no competitors in 0.5x-2x range ($4-$16)
- **Case H**: Filters too lenient, let through 90%+ of candidates
  - Example: Popular product category where most items meet basic criteria
- **Case I**: Price filter edge case - reference product at extreme price point
  - Example: $200 premium product vs $15 budget alternatives
- **Case J**: Rating filter removes high-review products with slightly lower ratings
  - Example: 10,000 reviews at 3.7★ vs 50 reviews at 4.2★
- **Case K**: New product with low review count filters out all competitors
  - Example: Reference has 23 reviews, min threshold is 100

#### Step 4: LLM Relevance Evaluation Issues
- **Case L**: False negative - LLM incorrectly rejects valid competitor
  - Example: Different naming convention but same product type
- **Case M**: False positive - LLM approves accessory as competitor
  - Example: "Universal phone mount" vs "phone case"
- **Case N**: All candidates rejected as accessories/bundles
  - Example: Search dominated by add-ons and replacement parts
- **Case O**: Borderline product - could be competitor or accessory
  - Example: "Laptop sleeve" vs "laptop bag" for backpack reference

#### Step 5: Rank & Select Issues
- **Case P**: Tie scenario - multiple products with identical scores
  - Example: Two competitors with same review count and rating
- **Case Q**: Only 1 candidate remaining - no ranking needed
- **Case R**: Selected competitor is poor match despite passing filters
  - Example: Meets technical criteria but wrong product type
- **Case S**: No competitors remaining (all rejected in step 4)
  - Example: All candidates were accessories

### Candidate Product Patterns (Include mix across all 20+ reference products):

For each reference product, include 8-12 candidate products with this distribution:

1. **2-3 Strong True Competitors** ✅
   - Similar price range (±30% of reference)
   - High ratings (4.2-4.8★)
   - High review counts (3000-10000+)
   - Same product category
   - Pass all filters
   - Confirmed by LLM

2. **1-2 Borderline Competitors** ⚠️
   - One filter barely fails (e.g., rating 3.79 vs 3.8 threshold)
   - OR passes filters but LLM confidence is low (< 0.80)
   - OR different style but same function

3. **2-3 Price Filter Failures** ❌
   - Too expensive (> 2x reference price)
   - Too cheap (< 0.5x reference price)

4. **1-2 Rating/Review Filter Failures** ❌
   - High reviews but low rating (e.g., 5000 reviews, 3.2★)
   - High rating but very few reviews (e.g., 4.8★, 12 reviews)

5. **2-3 Accessories/False Positives** ❌
   - Replacement parts (lids, straps, caps)
   - Carrying cases/bags for the product
   - Cleaning accessories
   - Bundles with multiple items
   - Pass filters but should be rejected by LLM

6. **1 Reference Product Duplicate** ❌ (IMPORTANT!)
   - The exact reference product appears in search results
   - Should be excluded to avoid self-comparison

## Product Pricing Guidelines

To ensure realistic pricing scenarios:
- **Budget tier**: $5-$20
- **Mid-range tier**: $20-$50
- **Premium tier**: $50-$150
- **Luxury tier**: $150+

Each reference product should have competitors spanning at least 2-3 price tiers.

## Ratings & Review Guidelines

Realistic distributions:
- **High quality**: 4.3-4.8★, 1000-15000 reviews
- **Good quality**: 3.9-4.2★, 500-5000 reviews
- **Mediocre**: 3.5-3.8★, 100-2000 reviews
- **Poor quality**: 2.5-3.4★, 50-1000 reviews
- **New/unproven**: 4.0-4.5★, 5-50 reviews (few reviews, uncertain quality)

## Example Product Variations

### Water Bottle Reference Product Examples:

**Premium Product** ($44.99, 4.6★, 3200 reviews):
- Candidates: Mix of premium brands, mid-range alternatives, budget bottles, accessories
- Edge case: Most candidates fail price filter (too cheap for 0.5x-2x range)

**Budget Product** ($9.99, 3.9★, 847 reviews):
- Candidates: Mostly budget products, few pass filters
- Edge case: Price range $5-$20 attracts many low-quality items

**Popular Mid-Range** ($27.99, 4.4★, 8932 reviews):
- Candidates: Strong competition, many pass filters
- Edge case: Difficult to rank due to many qualified competitors

## Output Format

Generate a single JSON file named `comprehensive_products_dataset.json` with the following:

```json
{
  "dataset_metadata": {
    "total_products": 20,
    "generated_date": "2025-01-XX",
    "description": "Comprehensive product dataset for X-Ray pipeline testing",
    "edge_cases_covered": [
      "All candidates fail filters",
      "No competitors remaining after LLM evaluation",
      "Tie in ranking",
      "Generic keywords with broad results",
      "Niche product with few candidates",
      "Price extremes",
      "New product with low reviews",
      "Search dominated by accessories"
    ]
  },
  "products": [
    // ... 20+ product objects as defined above
  ]
}
```

## Validation Checklist

Before generating, ensure:
- [ ] 20+ unique reference products across 10 categories
- [ ] Each reference product has 8-12 candidate products
- [ ] All 19 edge cases (A-S) are represented at least once
- [ ] Realistic prices, ratings, and review counts
- [ ] Candidate distribution follows the 2-3-2-1-2-1 pattern
- [ ] Each pipeline step has realistic input/output data
- [ ] Final outcomes vary (some succeed, some fail at different steps)
- [ ] Product titles are specific and descriptive
- [ ] ASINs are unique across all products (use format B0REF001-B0REF020 for reference, B0CAND001-B0CAND999 for candidates)

## Additional Instructions

1. **Make it realistic**: Use actual product naming conventions (brands can be fake but realistic)
2. **Vary the outcomes**: Not every reference product should successfully find a competitor
3. **Show pipeline failures**: Include cases where steps 3, 4, or 5 result in NO_COMPETITOR_FOUND
4. **Detailed filter results**: Every candidate evaluation should show exactly why it passed/failed each filter
5. **LLM reasoning**: For accessories, include specific rejection reasons
6. **Realistic categories**: Use Amazon-like category hierarchies (e.g., "Electronics > Headphones > Wireless Earbuds")

## Expected Output

A single JSON file approximately 50-100KB in size containing complete, realistic data for 20+ products that will thoroughly test the X-Ray system's ability to visualize and debug multi-step decision pipelines.
