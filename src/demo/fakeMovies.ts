export type Movie = {
  id: string
  title: string
  genres: string[]
  rating: number
  year: number
}

export function searchMoviesByThemes(themes: string[], limit = 50) {
  const movies: Movie[] = [
    {
      id: "M1",
      title: "Interstellar",
      genres: ["Sci-Fi", "Drama"],
      rating: 8.6,
      year: 2014
    },
    {
      id: "M2",
      title: "Tenet",
      genres: ["Sci-Fi", "Thriller"],
      rating: 7.8,
      year: 2020
    },
    {
      id: "M3",
      title: "The Butterfly Effect",
      genres: ["Sci-Fi", "Thriller"],
      rating: 7.3,
      year: 2004
    },
    {
      id: "M4",
      title: "Inception",
      genres: ["Sci-Fi", "Thriller"],
      rating: 8.8,
      year: 2010
    },
    {
      id: "M5",
      title: "Sci-Fi Movie Poster",
      genres: ["Merchandise"],
      rating: 7.5,
      year: 2021
    }
  ]

  return {
    total_found: movies.length,
    candidates: movies.slice(0, limit)
  }
}
