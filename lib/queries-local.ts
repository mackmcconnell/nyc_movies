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
