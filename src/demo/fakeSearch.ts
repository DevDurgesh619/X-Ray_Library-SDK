export function searchProducts(keywords: string[]) {
  const allProducts = [
    { id: "A", title: "HydroFlask Steel Bottle", price: 45, rating: 4.5, reviews: 8000 },
    { id: "B", title: "Generic Plastic Bottle", price: 9, rating: 3.1, reviews: 20 },
    { id: "C", title: "Yeti Steel Bottle", price: 35, rating: 4.4, reviews: 5000 }
  ]

  const matched = allProducts.filter(product =>
    keywords.some(keyword =>
      product.title.toLowerCase().includes(keyword.toLowerCase())
    )
  )

  return {
    results: matched,
    reasoning: `Matched ${matched.length} products using keywords: ${keywords.join(", ")}`
  }
}
