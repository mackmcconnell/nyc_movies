---
# nyc_movies-eyi3
title: Create unified scrape script that saves to database
status: todo
type: task
priority: high
created_at: 2026-01-24T19:11:08Z
updated_at: 2026-01-24T19:41:00Z
---

Create scripts/scrape.ts that orchestrates scraping and persists data to SQLite.

**Note:** Individual scrapers already exist at lib/scrapers/metrograph.ts and lib/scrapers/filmforum.ts. This task creates the orchestration layer that saves their output to the database.

## Acceptance Criteria
- Create scripts/scrape.ts that:
  1. Imports and runs both theater scrapers
  2. Clears old showtimes before inserting new ones
  3. Inserts/updates movies in Movie table (dedupe by title)
  4. Inserts showtimes in Showtime table with correct foreign keys
  5. Logs progress and results
- Handle errors gracefully (one scraper failing shouldn't stop the other)
- Output summary: X movies, Y showtimes saved

## Database Operations Needed
- Clear existing showtimes (or those older than today)
- Upsert movies (INSERT OR REPLACE based on title)
- Insert showtimes with proper movie_id and theater_id lookups
