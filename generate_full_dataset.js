#!/usr/bin/env node
/**
 * Script to generate the complete 22-product dummy dataset for X-Ray pipeline testing.
 * This extends the existing 7 products with 15 more covering all edge cases.
 */

const fs = require('fs');
const path = require('path');

// Read existing data
const existingData = JSON.parse(fs.readFileSync('comprehensive_products_dataset.json', 'utf8'));

// Helper to create filter result
const filterResult = (passed, actual, threshold) => ({
  passed,
  detail: `${actual} vs ${threshold}`
});

// Product templates for remaining 15 products
const remainingProducts = [
  // Product 8: Slim Leather Case - Edge Case: NO_COMPETITOR_FOUND after LLM rejects all
  {
    reference_product: {
      asin: "B0REF008",
      title: "Luxury Slim Italian Leather iPhone 14 Pro Case",
      price: 79.99,
      rating: 4.8,
      reviews: 234,
      category: "Cell Phones & Accessories > Cases > Leather Cases"
    },
    pipeline_steps: {
      step1_keyword_generation: {
        input: {
          product_title: "Luxury Slim Italian Leather iPhone 14 Pro Case",
          category: "Cell Phones & Accessories > Cases > Leather Cases"
        },
        output: {
          keywords: ["leather iphone case", "slim leather case iphone 14 pro", "luxury phone case"],
          model: "fake-gpt-4"
        }
      },
      step2_candidate_search: {
        input: {
          keyword: "leather iphone case",
          limit: 50
        },
        output: {
          total_results: 3421,
          candidates_fetched: 8,
          candidates: [
            {asin: "B0CAND058", title: "Mujjo Full Leather iPhone 14 Pro Case", price: 44.95, rating: 4.6, reviews: 892},
            {asin: "B0CAND059", title: "Bellroy Leather iPhone 14 Pro Case", price: 49.95, rating: 4.5, reviews: 1234},
            {asin: "B0CAND060", title: "Nomad Rugged Leather Case", price: 59.95, rating: 4.7, reviews: 2341},
            {asin: "B0CAND061", title: "Generic PU Leather Case", price: 12.99, rating: 3.9, reviews: 567},
            {asin: "B0CAND062", title: "Leather iPhone Wallet Case", price: 34.99, rating: 4.2, reviews: 3421},
            {asin: "B0REF008", title: "Luxury Slim Italian Leather iPhone 14 Pro Case", price: 79.99, rating: 4.8, reviews: 234},
            {asin: "B0CAND063", title: "Leather Phone Stand Case", price: 29.99, rating: 4.1, reviews: 892},
            {asin: "B0CAND064", title: "Premium Leather Card Holder Case", price: 39.99, rating: 4.4, reviews: 1567}
          ]
        }
      },
      step3_apply_filters: {
        input: {
          candidates_count: 8,
          reference_product: {
            asin: "B0REF008",
            title: "Luxury Slim Italian Leather iPhone 14 Pro Case",
            price: 79.99,
            rating: 4.8,
            reviews: 234
          },
          filters_applied: {
            priceRange: {min: 40.00, max: 159.98},
            minRating: 4.5,
            minReviews: 2000
          }
        },
        output: {
          total_evaluated: 8,
          passed: 1,
          failed: 7,
          evaluations: [
            {
              asin: "B0CAND058", title: "Mujjo Full Leather iPhone 14 Pro Case", price: 44.95, rating: 4.6, reviews: 892,
              filter_results: {
                price_range: {passed: true, detail: "$44.95 vs $40.00-$159.98"},
                min_rating: {passed: true, detail: "4.6 vs 4.5"},
                min_reviews: {passed: false, detail: "892 vs 2000"}
              },
              qualified: false
            },
            {
              asin: "B0CAND059", title: "Bellroy Leather iPhone 14 Pro Case", price: 49.95, rating: 4.5, reviews: 1234,
              filter_results: {
                price_range: {passed: true, detail: "$49.95 vs $40.00-$159.98"},
                min_rating: {passed: true, detail: "4.5 vs 4.5"},
                min_reviews: {passed: false, detail: "1234 vs 2000"}
              },
              qualified: false
            },
            {
              asin: "B0CAND060", title: "Nomad Rugged Leather Case", price: 59.95, rating: 4.7, reviews: 2341,
              filter_results: {
                price_range: {passed: true, detail: "$59.95 vs $40.00-$159.98"},
                min_rating: {passed: true, detail: "4.7 vs 4.5"},
                min_reviews: {passed: true, detail: "2341 vs 2000"}
              },
              qualified: true
            },
            {
              asin: "B0CAND061", title: "Generic PU Leather Case", price: 12.99, rating: 3.9, reviews: 567,
              filter_results: {
                price_range: {passed: false, detail: "$12.99 vs $40.00-$159.98"},
                min_rating: {passed: false, detail: "3.9 vs 4.5"},
                min_reviews: {passed: false, detail: "567 vs 2000"}
              },
              qualified: false
            },
            {
              asin: "B0CAND062", title: "Leather iPhone Wallet Case", price: 34.99, rating: 4.2, reviews: 3421,
              filter_results: {
                price_range: {passed: false, detail: "$34.99 vs $40.00-$159.98"},
                min_rating: {passed: false, detail: "4.2 vs 4.5"},
                min_reviews: {passed: true, detail: "3421 vs 2000"}
              },
              qualified: false
            },
            {
              asin: "B0REF008", title: "Luxury Slim Italian Leather iPhone 14 Pro Case", price: 79.99, rating: 4.8, reviews: 234,
              filter_results: {
                price_range: {passed: true, detail: "$79.99 vs $40.00-$159.98"},
                min_rating: {passed: true, detail: "4.8 vs 4.5"},
                min_reviews: {passed: false, detail: "234 vs 2000"},
                is_reference: true
              },
              qualified: false
            },
            {
              asin: "B0CAND063", title: "Leather Phone Stand Case", price: 29.99, rating: 4.1, reviews: 892,
              filter_results: {
                price_range: {passed: false, detail: "$29.99 vs $40.00-$159.98"},
                min_rating: {passed: false, detail: "4.1 vs 4.5"},
                min_reviews: {passed: false, detail: "892 vs 2000"}
              },
              qualified: false
            },
            {
              asin: "B0CAND064", title: "Premium Leather Card Holder Case", price: 39.99, rating: 4.4, reviews: 1567,
              filter_results: {
                price_range: {passed: false, detail: "$39.99 vs $40.00-$159.98"},
                min_rating: {passed: false, detail: "4.4 vs 4.5"},
                min_reviews: {passed: false, detail: "1567 vs 2000"}
              },
              qualified: false
            }
          ]
        }
      },
      step4_llm_relevance_evaluation: {
        input: {
          candidates_count: 1,
          reference_product: {
            title: "Luxury Slim Italian Leather iPhone 14 Pro Case",
            category: "Cell Phones & Accessories > Cases > Leather Cases"
          },
          model: "fake-gpt-4"
        },
        output: {
          total_evaluated: 1,
          confirmed_competitors: 0,
          false_positives_removed: 1,
          evaluations: [
            {
              asin: "B0CAND060",
              title: "Nomad Rugged Leather Case",
              is_competitor: false,
              rejection_reason: {
                code: "FALSE_NEGATIVE",
                explanation: "LLM incorrectly classified rugged case as non-competitor for slim case reference"
              },
              confidence: 0.78
            }
          ]
        }
      },
      step5_rank_and_select: {
        input: {
          candidates_count: 0,
          ranking_criteria: ["review_count", "rating"]
        },
        output: {
          ranked_candidates: [],
          selection: null
        }
      }
    },
    final_outcome: {
      decision: "NO_COMPETITOR_FOUND",
      selected_competitor: null,
      failure_reason: "All candidates rejected by LLM evaluation - false negative edge case"
    }
  }
];

console.log(`Generated ${remainingProducts.length} additional product(s)`);
console.log("This is a template - full generation requires extending the script...");
console.log(`Current total: ${existingData.products.length} products`);
console.log(`Need to add ${22 - existingData.products.length} more products to reach 22`);
console.log("\\nTo complete the dataset, add 14 more product templates covering:");
console.log("- Business laptop backpack");
console.log("- Outdoor laptop backpack");
console.log("- Chef knife set");
console.log("- Premium single chef knife");
console.log("- Extra thick yoga mat");
console.log("- Thin travel yoga mat");
console.log("- LED architect desk lamp");
console.log("- Smart desk lamp with app");
console.log("- Marathon running shoes");
console.log("- Trail running shoes");
console.log("- Pour-over coffee maker");
console.log("- Automatic drip coffee maker");
console.log("- High-capacity 30,000mAh power bank");
console.log("- Slim 10,000mAh power bank");

// For now, append what we have
existingData.products.push(...remainingProducts);

// Save
fs.writeFileSync('comprehensive_products_dataset.json', JSON.stringify(existingData, null, 2));
console.log(`\\nFile updated! Current count: ${existingData.products.length} products`);
