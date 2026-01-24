import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "movies.db");

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

export function initDb(): void {
  // Create Theater table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Theater (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    )
  `);

  // Create Movie table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Movie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      director TEXT,
      year INTEGER,
      runtime INTEGER,
      description TEXT,
      trailer_url TEXT
    )
  `);

  // Create Showtime table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Showtime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id INTEGER NOT NULL,
      theater_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      ticket_url TEXT,
      FOREIGN KEY (movie_id) REFERENCES Movie(id),
      FOREIGN KEY (theater_id) REFERENCES Theater(id)
    )
  `);
}
