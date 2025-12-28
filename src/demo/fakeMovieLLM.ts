import { Movie } from "./fakeMovies"

export type MovieRelevanceRejectionReason = {
  code: string
  explanation: string
}

export type MovieRelevanceResult = {
  movie: Movie
  isRelevant: boolean
  confidence: number
  rejection_reason?: MovieRelevanceRejectionReason
}

/**
 * Fake LLM relevance evaluation for movies.
 * - Marks obvious non-movie / merchandise items as not relevant
 * - Everything else is treated as thematically relevant to the reference movie
 */
export function llmEvaluateMovieRelevance(
  reference: string,
  movies: Movie[]
): MovieRelevanceResult[] {
  return movies.map(movie => {
    // Example: treat “Merchandise” genre as non-movie items
    //use xray fun here
    if (movie.genres.includes("Merchandise")) {
      return {
        movie,
        isRelevant: false,
        confidence: 0.98,
        rejection_reason: {
          code: "NON_MOVIE_MERCH",
          explanation: "Item is merchandise (e.g., poster, toy) rather than a movie"
        }
      }
    }

    // You can add more explicit rejection rules here if you want:
    // - different language
    // - kids-only content vs dark thriller, etc.

    return {
      movie,
      isRelevant: true,
      confidence: 0.85,
      // For relevant items we skip rejection_reason on purpose
    }
  })
}
