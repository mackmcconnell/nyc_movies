---
# nyc_movies-3bxt
title: Build scraper verification system
status: todo
type: task
created_at: 2026-01-24T19:14:35Z
updated_at: 2026-01-24T19:14:35Z
---

Create automated verification to ensure scraped data matches source websites. This prevents any incorrect data from being stored.

## Verification Steps
1. After scraping a movie, fetch its detail page URL and verify:
   - Title matches exactly
   - Director/year/runtime match if present
   - Showtime count matches what's on the page

2. Cross-reference checks:
   - Every showtime has a valid date (not in the past, not too far in future)
   - Every showtime has a ticket URL that returns 200
   - No empty titles or obviously malformed data

3. Logging:
   - Log any mismatches as errors
   - Fail the scrape if verification fails
   - Report summary: X movies scraped, Y verified, Z failed

## Acceptance Criteria
- Verification runs automatically after each scrape
- Mismatches cause the scrape to fail (don't store bad data)
- Clear error messages showing what didn't match
- Can run verification independently: npm run verify
