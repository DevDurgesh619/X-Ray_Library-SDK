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
      id: "M101",
      title: "The Matrix",
      genres: ["Sci-Fi", "Action"],
      rating: 8.7,
      year: 1999
    },
    {
      id: "M102",
      title: "Arrival",
      genres: ["Sci-Fi", "Drama"],
      rating: 7.9,
      year: 2016
    },
    {
      id: "M103",
      title: "Blade Runner 2049",
      genres: ["Sci-Fi", "Thriller"],
      rating: 8.0,
      year: 2017
    },
    {
      id: "M104",
      title: "Eternal Sunshine of the Spotless Mind",
      genres: ["Romance", "Drama", "Sci-Fi"],
      rating: 8.3,
      year: 2004
    },
    {
      id: "M105",
      title: "Ex Machina",
      genres: ["Sci-Fi", "Psychological Thriller"],
      rating: 7.7,
      year: 2014
    }
  ]

  return {
    total_found: movies.length,
    candidates: movies.slice(0, limit)
  }
}
