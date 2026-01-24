import { db } from "./db";
import {
  Theater,
  Movie,
  Showtime,
  MovieWithShowtimes,
} from "./types";

// Theater queries
const getAllTheatersStmt = db.prepare("SELECT * FROM Theater");
const getTheaterBySlugStmt = db.prepare("SELECT * FROM Theater WHERE slug = ?");

export function getTheaters(): Theater[] {
  return getAllTheatersStmt.all() as Theater[];
}

export function getTheaterBySlug(slug: string): Theater | undefined {
  return getTheaterBySlugStmt.get(slug) as Theater | undefined;
}

// Movie queries
const getMovieByIdStmt = db.prepare("SELECT * FROM Movie WHERE id = ?");

const getShowtimesByMovieIdStmt = db.prepare(`
  SELECT
    s.id,
    s.movie_id,
    s.theater_id,
    s.date,
    s.time,
    s.ticket_url,
    t.id as t_id,
    t.name as t_name,
    t.url as t_url,
    t.slug as t_slug
  FROM Showtime s
  JOIN Theater t ON s.theater_id = t.id
  WHERE s.movie_id = ?
  ORDER BY s.date, s.time
`);

const getMoviesWithShowtimesByDateStmt = db.prepare(`
  SELECT
    m.id,
    m.title,
    m.director,
    m.year,
    m.runtime,
    m.description,
    m.trailer_url,
    s.id as s_id,
    s.movie_id as s_movie_id,
    s.theater_id as s_theater_id,
    s.date as s_date,
    s.time as s_time,
    s.ticket_url as s_ticket_url,
    t.id as t_id,
    t.name as t_name,
    t.url as t_url,
    t.slug as t_slug
  FROM Movie m
  JOIN Showtime s ON m.id = s.movie_id
  JOIN Theater t ON s.theater_id = t.id
  WHERE s.date = ?
  ORDER BY m.title, s.time
`);

const getMoviesWithShowtimesByTheaterStmt = db.prepare(`
  SELECT
    m.id,
    m.title,
    m.director,
    m.year,
    m.runtime,
    m.description,
    m.trailer_url,
    s.id as s_id,
    s.movie_id as s_movie_id,
    s.theater_id as s_theater_id,
    s.date as s_date,
    s.time as s_time,
    s.ticket_url as s_ticket_url,
    t.id as t_id,
    t.name as t_name,
    t.url as t_url,
    t.slug as t_slug
  FROM Movie m
  JOIN Showtime s ON m.id = s.movie_id
  JOIN Theater t ON s.theater_id = t.id
  WHERE s.theater_id = ?
  ORDER BY m.title, s.date, s.time
`);

interface JoinedRow {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  description: string | null;
  trailer_url: string | null;
  s_id: number;
  s_movie_id: number;
  s_theater_id: number;
  s_date: string;
  s_time: string;
  s_ticket_url: string | null;
  t_id: number;
  t_name: string;
  t_url: string;
  t_slug: string;
}

function groupRowsIntoMoviesWithShowtimes(rows: JoinedRow[]): MovieWithShowtimes[] {
  const movieMap = new Map<number, MovieWithShowtimes>();

  for (const row of rows) {
    if (!movieMap.has(row.id)) {
      movieMap.set(row.id, {
        id: row.id,
        title: row.title,
        director: row.director,
        year: row.year,
        runtime: row.runtime,
        description: row.description,
        trailer_url: row.trailer_url,
        showtimes: [],
      });
    }

    const movie = movieMap.get(row.id)!;
    movie.showtimes.push({
      id: row.s_id,
      movie_id: row.s_movie_id,
      theater_id: row.s_theater_id,
      date: row.s_date,
      time: row.s_time,
      ticket_url: row.s_ticket_url,
      theater: {
        id: row.t_id,
        name: row.t_name,
        url: row.t_url,
        slug: row.t_slug,
      },
    });
  }

  return Array.from(movieMap.values());
}

export function getMoviesByDate(date: string): MovieWithShowtimes[] {
  const rows = getMoviesWithShowtimesByDateStmt.all(date) as JoinedRow[];
  return groupRowsIntoMoviesWithShowtimes(rows);
}

export function getMoviesByTheater(theaterId: number): MovieWithShowtimes[] {
  const rows = getMoviesWithShowtimesByTheaterStmt.all(theaterId) as JoinedRow[];
  return groupRowsIntoMoviesWithShowtimes(rows);
}

export function getMovieById(id: number): MovieWithShowtimes | undefined {
  const movie = getMovieByIdStmt.get(id) as Movie | undefined;
  if (!movie) {
    return undefined;
  }

  interface ShowtimeRow {
    id: number;
    movie_id: number;
    theater_id: number;
    date: string;
    time: string;
    ticket_url: string | null;
    t_id: number;
    t_name: string;
    t_url: string;
    t_slug: string;
  }

  const showtimeRows = getShowtimesByMovieIdStmt.all(id) as ShowtimeRow[];

  return {
    ...movie,
    showtimes: showtimeRows.map((row) => ({
      id: row.id,
      movie_id: row.movie_id,
      theater_id: row.theater_id,
      date: row.date,
      time: row.time,
      ticket_url: row.ticket_url,
      theater: {
        id: row.t_id,
        name: row.t_name,
        url: row.t_url,
        slug: row.t_slug,
      },
    })),
  };
}

// Insert queries
const insertMovieStmt = db.prepare(`
  INSERT INTO Movie (title, director, year, runtime, description, trailer_url)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertShowtimeStmt = db.prepare(`
  INSERT INTO Showtime (movie_id, theater_id, date, time, ticket_url)
  VALUES (?, ?, ?, ?, ?)
`);

export function insertMovie(movie: Omit<Movie, "id">): number {
  const result = insertMovieStmt.run(
    movie.title,
    movie.director,
    movie.year,
    movie.runtime,
    movie.description,
    movie.trailer_url
  );
  return result.lastInsertRowid as number;
}

export function insertShowtime(showtime: Omit<Showtime, "id">): number {
  const result = insertShowtimeStmt.run(
    showtime.movie_id,
    showtime.theater_id,
    showtime.date,
    showtime.time,
    showtime.ticket_url
  );
  return result.lastInsertRowid as number;
}

// Clear queries for scraper refresh
const clearShowtimesStmt = db.prepare("DELETE FROM Showtime");
const clearMoviesStmt = db.prepare("DELETE FROM Movie");

export function clearShowtimes(): void {
  clearShowtimesStmt.run();
}

export function clearMovies(): void {
  clearMoviesStmt.run();
}
