---
# nyc_movies-qth6
title: Build Metrograph scraper
status: todo
type: task
created_at: 2026-01-24T19:11:08Z
updated_at: 2026-01-24T19:11:08Z
---

Create scraper for Metrograph theater (https://metrograph.com).

## Scraping Notes (from project brief)
- Calendar-based navigation with day tabs
- Fetch different dates via URL parameter: ?selected_day=YYYY-MM-DD
- Film detail pages at: /film/?vista_film_id=[ID]
- Ticket links go to t.metrograph.com

## Implementation Requirements (NO HALLUCINATION)
1. **Before writing any scraper code**: Fetch and analyze the actual HTML/JSON from metrograph.com
2. **Document the real selectors**: Record the exact CSS selectors/JSON paths found on the live site
3. **No guessing**: If a field's location is unclear, fetch more pages to confirm the pattern
4. **Only extract what exists**: If a field isn't on the page, leave it null - never invent data

## Verification (REQUIRED)
- After scraping, automatically verify each movie against its source page
- Compare extracted title, showtimes, and key fields against a fresh fetch
- If any mismatch is found, fail the scrape and report the discrepancy
- Depends on: nyc_movies-3bxt (verification system)

## Acceptance Criteria
- Scrape movie listings for configurable date range
- Extract: title, director, year, runtime, description, trailer_url
- Extract showtimes with ticket URLs
- Store results in database
- Handle edge cases (missing data, special events)
- **All scraped data passes automated verification**
