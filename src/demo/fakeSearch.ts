export function searchProducts(keyword: string, limit = 50) {
  const products = [
    // ✅ STRONG TRUE COMPETITORS
    {
      asin: "B0COMP01",
      title: "HydroFlask 32oz Wide Mouth Insulated Bottle",
      price: 44.99,
      rating: 4.5,
      reviews: 8932
    },
    {
      asin: "B0COMP02",
      title: "Yeti Rambler 26oz Stainless Steel Bottle",
      price: 34.99,
      rating: 4.4,
      reviews: 5621
    },
    {
      asin: "B0COMP07",
      title: "Stanley Adventure Quencher 30oz Insulated",
      price: 35.0,
      rating: 4.3,
      reviews: 4102
    },

    // ⚠️ BORDERLINE / FILTER FAIL CASES
    {
      asin: "B0COMP03",
      title: "Generic Stainless Steel Bottle",
      price: 8.99,
      rating: 3.2,
      reviews: 45
    },
    {
      asin: "B0COMP04",
      title: "Premium Titanium Water Bottle",
      price: 89.0,
      rating: 4.8,
      reviews: 234
    },

    // ❌ FALSE POSITIVES (ACCESSORIES)
    {
      asin: "B0COMP05",
      title: "Replacement Lid for HydroFlask",
      price: 12.99,
      rating: 4.7,
      reviews: 3421
    },
    {
      asin: "B0COMP06",
      title: "Water Bottle Carrier Bag with Strap",
      price: 18.99,
      rating: 4.6,
      reviews: 2109
    }, {
    asin: "B0XYZ123",
    title: "Stainless Steel Water Bottle 32oz Insulated",
    price: 25.0,
    rating: 4.2,
    reviews: 1247,
    category: "Sports & Outdoors > Water Bottles"
  }
  ]

  return {
    total_results: 2847,
    candidates_fetched: Math.min(limit, products.length),
    candidates: products.slice(0, limit)
  }
}
