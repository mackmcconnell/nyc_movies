/**
 * Sync local SQLite database to Turso
 *
 * Usage: npx tsx scripts/sync-to-turso.ts
 */

import { localDb } from "../lib/db-local";
import { createClient } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  console.error("TURSO_DATABASE_URL is not set");
  console.error("Set it with: export TURSO_DATABASE_URL=libsql://...");
  process.exit(1);
}

const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function syncToTurso() {
  console.log("Syncing local database to Turso...\n");

  // Clear Turso tables
  console.log("Clearing Turso tables...");
  await turso.execute("DELETE FROM Showtime");
  await turso.execute("DELETE FROM Movie");
  await turso.execute("DELETE FROM Theater");
  console.log("Tables cleared.\n");

  // Sync theaters first (required for foreign keys)
  const theaters = localDb.prepare("SELECT * FROM Theater").all() as {
    id: number;
    name: string;
    url: string;
    slug: string;
  }[];

  console.log(`Syncing ${theaters.length} theaters...`);

  for (const theater of theaters) {
    await turso.execute({
      sql: `INSERT INTO Theater (id, name, url, slug)
            VALUES (?, ?, ?, ?)`,
      args: [theater.id, theater.name, theater.url, theater.slug],
    });
  }
  console.log(`Theaters synced.\n`);

  // Sync movies
  const movies = localDb.prepare("SELECT * FROM Movie").all() as {
    id: number;
    title: string;
    director: string | null;
    year: number | null;
    runtime: number | null;
    description: string | null;
    trailer_url: string | null;
    image_url: string | null;
  }[];

  console.log(`Syncing ${movies.length} movies...`);

  for (const movie of movies) {
    await turso.execute({
      sql: `INSERT INTO Movie (id, title, director, year, runtime, description, trailer_url, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        movie.id,
        movie.title,
        movie.director,
        movie.year,
        movie.runtime,
        movie.description,
        movie.trailer_url,
        movie.image_url,
      ],
    });
  }
  console.log(`Movies synced.\n`);

  // Sync showtimes
  const showtimes = localDb.prepare("SELECT * FROM Showtime").all() as {
    id: number;
    movie_id: number;
    theater_id: number;
    date: string;
    time: string;
    ticket_url: string | null;
  }[];

  console.log(`Syncing ${showtimes.length} showtimes...`);

  for (const showtime of showtimes) {
    await turso.execute({
      sql: `INSERT INTO Showtime (id, movie_id, theater_id, date, time, ticket_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        showtime.id,
        showtime.movie_id,
        showtime.theater_id,
        showtime.date,
        showtime.time,
        showtime.ticket_url,
      ],
    });
  }
  console.log(`Showtimes synced.\n`);

  console.log("✅ Sync complete!");
}

syncToTurso().catch(console.error);
