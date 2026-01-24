---
# nyc_movies-elji
title: Build API route: Get movies by date
status: todo
type: task
created_at: 2026-01-24T19:11:19Z
updated_at: 2026-01-24T19:11:19Z
---

Create API endpoint to fetch movies grouped by date.

## Endpoint
GET /api/movies?date=YYYY-MM-DD (optional, defaults to today)
GET /api/movies?from=YYYY-MM-DD&to=YYYY-MM-DD (date range)

## Response
Returns movies with their showtimes for the requested date(s), including theater info.

## Acceptance Criteria
- Endpoint returns properly formatted JSON
- Supports single date and date range queries
- Includes all movie details and showtimes
- Proper error handling for invalid dates
