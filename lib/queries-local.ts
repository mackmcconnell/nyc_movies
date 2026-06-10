import { localDb } from "./db-local";
import { Theater, Movie } from "./types";

// Theater queries
const getAllTheatersStmt = localDb.prepare("SELECT * FROM Theater");
const getTheaterBySlugStmt = localDb.prepare("SELECT * FROM Theater WHERE slug = ?");

export function getTheaters(): Theater[] {
  return getAllTheatersStmt.all() as Theater[];
}

export function getTheaterBySlug(slug: string): Theater | undefined {
  return getTheaterBySlugStmt.get(slug) as Theater | undefined;
}

// Insert queries
const insertMovieStmt = localDb.prepare(`
  INSERT INTO Movie (title, director, year, runtime, description, trailer_url, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function insertMovie(movie: Omit<Movie, "id">): number {
  const result = insertMovieStmt.run(
    movie.title,
    movie.director,
    movie.year,
    movie.runtime,
    movie.description,
    movie.trailer_url,
    movie.image_url
  );
  return result.lastInsertRowid as number;
}

// When the same film is screened at multiple theaters it is deduplicated by
// title, so only the first theater's metadata is inserted. This backfills any
// columns that are still NULL from a later theater's richer data (e.g. one
// theater has a trailer/synopsis the other lacks). COALESCE keeps existing
// non-null values, so first-writer-wins for fields that are already populated.
const backfillMovieStmt = localDb.prepare(`
  UPDATE Movie SET
    director = COALESCE(director, ?),
    year = COALESCE(year, ?),
    runtime = COALESCE(runtime, ?),
    description = COALESCE(description, ?),
    trailer_url = COALESCE(trailer_url, ?),
    image_url = COALESCE(image_url, ?)
  WHERE id = ?
`);

export function backfillMovieFields(id: number, movie: Omit<Movie, "id">): void {
  backfillMovieStmt.run(
    movie.director,
    movie.year,
    movie.runtime,
    movie.description,
    movie.trailer_url,
    movie.image_url,
    id
  );
}

const insertShowtimeStmt = localDb.prepare(`
  INSERT INTO Showtime (movie_id, theater_id, date, time, ticket_url)
  VALUES (?, ?, ?, ?, ?)
`);

export function insertShowtime(showtime: {
  movie_id: number;
  theater_id: number;
  date: string;
  time: string;
  ticket_url: string | null;
}): number {
  const result = insertShowtimeStmt.run(
    showtime.movie_id,
    showtime.theater_id,
    showtime.date,
    showtime.time,
    showtime.ticket_url
  );
  return result.lastInsertRowid as number;
}

// Clear queries
export function clearShowtimes(): void {
  localDb.exec("DELETE FROM Showtime");
}

export function clearMovies(): void {
  localDb.exec("DELETE FROM Movie");
}
