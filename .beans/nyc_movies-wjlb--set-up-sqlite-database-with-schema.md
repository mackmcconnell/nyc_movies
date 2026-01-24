---
# nyc_movies-wjlb
title: Set up SQLite database with schema
status: done
type: task
created_at: 2026-01-24T19:10:54Z
updated_at: 2026-01-24T19:10:54Z
---

Create the SQLite database and define the schema for theaters, movies, and showtimes.

## Schema (from project brief)

**Theater**
- id
- name
- url
- slug

**Movie**
- id
- title
- director
- year
- runtime
- description
- trailer_url

**Showtime**
- id
- movie_id (FK)
- theater_id (FK)
- date
- time
- ticket_url

## Acceptance Criteria
- SQLite database file created
- All three tables created with proper relationships
- Foreign keys configured
- Database connection utility working
