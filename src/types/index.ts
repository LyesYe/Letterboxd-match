export interface WatchlistMovie {
  title: string;
  year: number | null;
  letterboxdUrl: string;
}

export interface MovieDetails {
  id: number;
  title: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  tmdbRating: number;
  tmdbVoteCount: number;
  letterboxdUrl: string;
  genres: string[];
  runtime: number | null;
  watchedByUsers: string[];
}

export interface PoolMovie {
  tmdbId: number | null;
  title: string;
  year: number | null;
  posterPath: string | null;
  tmdbRating: number;
  genres: string[];
  overview: string;
  letterboxdUrl: string;
  foundInUsers: string[];
  watchedByUsers: string[];
}

export type MatchMode = "intersection" | "partial" | "union";

export interface RecommendationResult {
  movie: MovieDetails;
  poolSize: number;
  mode: MatchMode;
  userCount: number;
}
