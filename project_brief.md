# NYC Movies - Project Brief

## Problem
Finding what's playing at independent/arthouse movie theaters in NYC requires navigating multiple clunky websites and opening many tabs. There's no single place to see showtimes across favorite theaters.

## Solution
A web app called **NYC Movies** that aggregates movie listings from select NYC independent theaters into one clean interface.

---

## Target Theaters (Initial)

1. **Metrograph** - https://metrograph.com
2. **Film Forum** - https://filmforum.org

---

## Features

**Display for each movie:**
- Title
- Showtimes
- Theater name
- Synopsis/description
- Trailer link
- Runtime, director, year
- Ticket purchase link

**Browsing:**
- Primary organization: **by date** (index page shows movies grouped by day)
- Filter by theater
- Show all currently scheduled movies (not just today)

**Data updates:**
- Scrape can run weekly by default
- Manual scrape command available: `npm run scrape`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (React) |
| Styling | Tailwind CSS |
| Database | SQLite |
| Scraping | Node.js + Cheerio (HTML parsing) / JSON parsing |
| Hosting | Vercel |

---

## Data Model

```
Theater
  - id
  - name
  - url
  - slug

Movie
  - id
  - title
  - director
  - year
  - runtime
  - description
  - trailer_url

Showtime
  - id
  - movie_id
  - theater_id
  - date
  - time
  - ticket_url
```

---

## Scraping Notes

**Metrograph:**
- Calendar-based navigation with day tabs
- Fetch different dates via URL parameter: `?selected_day=YYYY-MM-DD`
- Film detail pages at: `/film/?vista_film_id=[ID]`
- Ticket links go to `t.metrograph.com`

**Film Forum:**
- Has JSON-LD schema markup with `ScreeningEvent` objects—parse this structured data rather than scraping HTML where possible
- Also has weekly schedule grid with day tabs
- Film detail pages at: `/film/[title-slug]`
- Ticket links go to `my.filmforum.org/events/[slug]`

---

## Commands

- `npm run dev` - Start development server
- `npm run scrape` - Manually trigger scrape of all theaters
- `npm run build` - Build for production

---

## Future Considerations (Not for MVP)
- Add more theaters
- User accounts / favorites
- Notifications for specific movies
- More advanced filtering (by genre, director, etc.)
