---
# nyc_movies-0s69
title: Build API route: Get single movie details
status: todo
type: task
created_at: 2026-01-24T19:11:20Z
updated_at: 2026-01-24T19:11:20Z
---

Create API endpoint to fetch details for a single movie.

## Endpoint
GET /api/movies/[id]

## Response
Returns full movie details including:
- Title, director, year, runtime
- Description
- Trailer URL
- All showtimes across all theaters

## Acceptance Criteria
- Returns complete movie data
- Includes all showtimes grouped by theater and date
- Proper 404 for unknown movie IDs
