---
# nyc_movies-7vxf
title: Build Film Forum scraper
status: todo
type: task
created_at: 2026-01-24T19:11:08Z
updated_at: 2026-01-24T19:11:08Z
---

Create scraper for Film Forum theater (https://filmforum.org).

## Scraping Notes (from project brief)
- Has JSON-LD schema markup with ScreeningEvent objects - parse this structured data rather than scraping HTML where possible
- Also has weekly schedule grid with day tabs
- Film detail pages at: /film/[title-slug]
- Ticket links go to my.filmforum.org/events/[slug]

## Implementation Requirements (NO HALLUCINATION)
1. **Before writing any scraper code**: Fetch and analyze the actual HTML/JSON-LD from filmforum.org
2. **Document the real selectors**: Record the exact JSON-LD schema paths or CSS selectors found on the live site
3. **No guessing**: If a field's location is unclear, fetch more pages to confirm the pattern
4. **Only extract what exists**: If a field isn't on the page, leave it null - never invent data

## Verification (REQUIRED)
- After scraping, automatically verify each movie against its source page
- Compare extracted title, showtimes, and key fields against a fresh fetch
- If any mismatch is found, fail the scrape and report the discrepancy
- Depends on: nyc_movies-3bxt (verification system)

## Acceptance Criteria
- Scrape movie listings for configurable date range
- Prefer JSON-LD structured data over HTML scraping
- Extract: title, director, year, runtime, description, trailer_url
- Extract showtimes with ticket URLs
- Store results in database
- Handle edge cases (missing data, special events)
- **All scraped data passes automated verification**
