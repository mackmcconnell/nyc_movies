import { db } from "./db";
import {
  Theater,
  Movie,
  MovieWithShowtimes,
} from "./types";

// Theater queries
export async function getTheaters(): Promise<Theater[]> {
  const result = await db.execute("SELECT * FROM Theater");
  return result.rows as unknown as Theater[];
}

export async function getTheaterBySlug(slug: string): Promise<Theater | undefined> {
  const result = await db.execute({
    sql: "SELECT * FROM Theater WHERE slug = ?",
    args: [slug],
  });
  return result.rows[0] as unknown as Theater | undefined;
}

// Movie queries
export async function getAllMovieIds(): Promise<number[]> {
  const result = await db.execute("SELECT id FROM Movie");
  return result.rows.map((row) => row.id as number);
}

export async function getMovieById(id: number): Promise<MovieWithShowtimes | undefined> {
  const movieResult = await db.execute({
    sql: "SELECT * FROM Movie WHERE id = ?",
    args: [id],
  });

  const movie = movieResult.rows[0] as unknown as Movie | undefined;
  if (!movie) {
    return undefined;
  }

  const showtimesResult = await db.execute({
    sql: `
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
    `,
    args: [id],
  });

  return {
    ...movie,
    showtimes: showtimesResult.rows.map((row) => ({
      id: row.id as number,
      movie_id: row.movie_id as number,
      theater_id: row.theater_id as number,
      date: row.date as string,
      time: row.time as string,
      ticket_url: row.ticket_url as string | null,
      theater: {
        id: row.t_id as number,
        name: row.t_name as string,
        url: row.t_url as string,
        slug: row.t_slug as string,
      },
    })),
  };
}

export async function getMoviesByDate(date: string): Promise<MovieWithShowtimes[]> {
  const result = await db.execute({
    sql: `
      SELECT
        m.id,
        m.title,
        m.director,
        m.year,
        m.runtime,
        m.description,
        m.trailer_url,
        m.image_url,
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
    `,
    args: [date],
  });

  return groupRowsIntoMoviesWithShowtimes(result.rows);
}

export async function getMoviesByTheater(theaterId: number): Promise<MovieWithShowtimes[]> {
  const result = await db.execute({
    sql: `
      SELECT
        m.id,
        m.title,
        m.director,
        m.year,
        m.runtime,
        m.description,
        m.trailer_url,
        m.image_url,
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
    `,
    args: [theaterId],
  });

  return groupRowsIntoMoviesWithShowtimes(result.rows);
}

interface JoinedRow {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  description: string | null;
  trailer_url: string | null;
  image_url: string | null;
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

function groupRowsIntoMoviesWithShowtimes(rows: unknown[]): MovieWithShowtimes[] {
  const movieMap = new Map<number, MovieWithShowtimes>();

  for (const rawRow of rows) {
    const row = rawRow as JoinedRow;
    if (!movieMap.has(row.id)) {
      movieMap.set(row.id, {
        id: row.id,
        title: row.title,
        director: row.director,
        year: row.year,
        runtime: row.runtime,
        description: row.description,
        trailer_url: row.trailer_url,
        image_url: row.image_url,
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

// Insert queries
export async function insertMovie(movie: Omit<Movie, "id">): Promise<number> {
  const result = await db.execute({
    sql: `
      INSERT INTO Movie (title, director, year, runtime, description, trailer_url, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      movie.title,
      movie.director,
      movie.year,
      movie.runtime,
      movie.description,
      movie.trailer_url,
      movie.image_url,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function insertShowtime(showtime: {
  movie_id: number;
  theater_id: number;
  date: string;
  time: string;
  ticket_url: string | null;
}): Promise<number> {
  const result = await db.execute({
    sql: `
      INSERT INTO Showtime (movie_id, theater_id, date, time, ticket_url)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      showtime.movie_id,
      showtime.theater_id,
      showtime.date,
      showtime.time,
      showtime.ticket_url,
    ],
  });
  return Number(result.lastInsertRowid);
}

// Clear queries for scraper refresh
export async function clearShowtimes(): Promise<void> {
  await db.execute("DELETE FROM Showtime");
}

export async function clearMovies(): Promise<void> {
  await db.execute("DELETE FROM Movie");
}
