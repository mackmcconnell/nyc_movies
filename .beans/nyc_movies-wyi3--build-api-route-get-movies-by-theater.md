---
# nyc_movies-wyi3
title: Build API route: Get movies by theater
status: todo
type: task
created_at: 2026-01-24T19:11:19Z
updated_at: 2026-01-24T19:11:19Z
---

Create API endpoint to fetch movies filtered by theater.

## Endpoint
GET /api/movies?theater=metrograph
GET /api/movies?theater=film-forum

## Response
Returns all scheduled movies for the specified theater.

## Acceptance Criteria
- Filter by theater slug
- Can combine with date filters
- Returns proper 404 for unknown theaters
