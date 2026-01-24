---
# nyc_movies-adve
title: Handle movie deduplication across theaters
status: todo
type: task
created_at: 2026-01-24T19:11:59Z
updated_at: 2026-01-24T19:11:59Z
---

Handle cases where the same movie plays at multiple theaters.

## Problem
The same film might play at both Metrograph and Film Forum. We need to decide whether to:
- Keep separate movie records per theater
- Deduplicate and show one movie with showtimes from multiple theaters

## Acceptance Criteria
- Clear strategy for handling duplicates
- Movie detail page shows all showtimes regardless of theater
- No confusing duplicate entries in listings
