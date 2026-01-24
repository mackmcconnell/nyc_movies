/**
 * Metrograph Theater Scraper
 *
 * Scrapes movie listings from https://metrograph.com
 *
 * ## Site Structure (verified 2026-01-24)
 *
 * ### Calendar Page (https://metrograph.com/?selected_day=YYYY-MM-DD)
 * - Film titles: <h4><a href="/film/?vista_film_id=XXXXX">Title</a></h4>
 * - Showtimes: <a href="https://t.metrograph.com/Ticketing/visSelectTickets.aspx?cinemacode=9999&txtSessionId=XXXXX">Time</a>
 * - Date navigation: URL parameter ?selected_day=YYYY-MM-DD
 *
 * ### Film Detail Page (https://metrograph.com/film/?vista_film_id=XXXXX)
 * - Title: <h1>Film Title</h1>
 * - Director: <h5>Director: Name</h5>
 * - Year/Runtime/Format: <h5>YYYY / XXXmin / Format</h5>
 * - Synopsis: <p> following metadata
 * - Showtimes: <h6>Day Mon DD</h6> followed by <a href="ticket-url">Time</a>
 */

import * as cheerio from "cheerio";
import type { Movie, Showtime } from "../types";

const BASE_URL = "https://metrograph.com";
const TICKET_BASE_URL = "https://t.metrograph.com/Ticketing/visSelectTickets.aspx";

// Types for scraper results (without database IDs)
export interface ScrapedMovie extends Omit<Movie, "id"> {
  vista_film_id: string;
}

export interface ScrapedShowtime extends Omit<Showtime, "id" | "movie_id" | "theater_id"> {
  vista_film_id: string; // Used to link to movie
}

export interface ScrapeResult {
  movies: ScrapedMovie[];
  showtimes: ScrapedShowtime[];
}

/**
 * Fetches HTML from a URL with error handling
 */
async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extracts vista_film_id from a film detail URL
 * Example: /film/?vista_film_id=9999004659 -> 9999004659
 */
function extractVistaFilmId(href: string): string | null {
  const match = href.match(/vista_film_id=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extracts txtSessionId from a ticket URL
 * Example: https://t.metrograph.com/Ticketing/visSelectTickets.aspx?cinemacode=9999&txtSessionId=28921
 */
function extractSessionId(href: string): string | null {
  const match = href.match(/txtSessionId=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Parses time string like "4:15pm" to 24-hour format "16:15"
 */
function parseTime(timeStr: string): string {
  const match = timeStr.toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!match) {
    return timeStr; // Return original if parsing fails
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3];

  if (period === "pm" && hours !== 12) {
    hours += 12;
  } else if (period === "am" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

/**
 * Parses the year/runtime/format line from film detail page
 * Example: "1992 / 108min / DCP" -> { year: 1992, runtime: 108 }
 */
function parseYearRuntimeLine(text: string): { year: number | null; runtime: number | null } {
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  const runtimeMatch = text.match(/(\d+)\s*min/i);

  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    runtime: runtimeMatch ? parseInt(runtimeMatch[1], 10) : null,
  };
}

/**
 * Result from scraping a film detail page
 */
interface FilmDetailResult {
  movie: ScrapedMovie;
  showtimes: ScrapedShowtime[];
}

/**
 * Scrapes detailed movie information and showtimes from a film detail page
 */
async function scrapeFilmDetail(vistaFilmId: string, referenceYear: number): Promise<FilmDetailResult> {
  const url = `${BASE_URL}/film/?vista_film_id=${vistaFilmId}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Title: <h1>Film Title</h1>
  const title = $("h1").first().text().trim();

  // Look for director and year/runtime in h5 elements
  let director: string | null = null;
  let year: number | null = null;
  let runtime: number | null = null;

  $("h5").each((_, el) => {
    const text = $(el).text().trim();

    // Director: "Director: Name" or "Directors: Name1, Name2"
    const directorMatch = text.match(/^Directors?:\s*(.+)$/i);
    if (directorMatch) {
      director = directorMatch[1].trim();
    }

    // Year/Runtime: "1992 / 108min / DCP"
    if (text.match(/\d{4}\s*\/.*min/i)) {
      const parsed = parseYearRuntimeLine(text);
      year = parsed.year;
      runtime = parsed.runtime;
    }
  });

  // Description: First substantial paragraph after metadata
  // Skip very short paragraphs that might be metadata
  let description: string | null = null;
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    // Look for a paragraph that's substantial (>50 chars) and doesn't look like metadata
    if (!description && text.length > 50 && !text.match(/^(Director|Runtime|Year|Format):/i)) {
      description = text;
    }
  });

  // Trailer: Look for YouTube embeds or video links
  let trailerUrl: string | null = null;
  $("iframe").each((_, el) => {
    const src = $(el).attr("src");
    if (src && (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com"))) {
      trailerUrl = src;
    }
  });
  // Also check for direct links
  if (!trailerUrl) {
    $('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="vimeo.com"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !trailerUrl) {
        trailerUrl = href;
      }
    });
  }

  // Image: Look for og:image meta tag or poster images
  let imageUrl: string | null = null;
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    imageUrl = ogImage;
  }
  // Fallback: look for main poster image
  if (!imageUrl) {
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !imageUrl && (src.includes("poster") || src.includes("film") || src.includes("movie"))) {
        imageUrl = src.startsWith("http") ? src : `${BASE_URL}${src}`;
      }
    });
  }

  const movie: ScrapedMovie = {
    title,
    director,
    year,
    runtime,
    description,
    trailer_url: trailerUrl,
    image_url: imageUrl,
    vista_film_id: vistaFilmId,
  };

  // Scrape showtimes from the same page
  const showtimes = await scrapeShowtimesFromFilmPage(vistaFilmId, html, referenceYear);

  return { movie, showtimes };
}

/**
 * Scrapes film IDs and showtimes from a calendar page for a specific date
 * Returns both the list of film IDs and the showtimes for that day
 */
async function scrapeCalendarPage(date: string): Promise<{ filmIds: Set<string>; showtimes: ScrapedShowtime[] }> {
  const url = `${BASE_URL}/?selected_day=${date}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const filmIds = new Set<string>();
  const showtimes: ScrapedShowtime[] = [];

  // Track the current film context as we traverse the page
  // The calendar page shows films with their showtimes in sequential blocks
  let currentFilmId: string | null = null;

  // Get all links on the page
  $("a").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");
    if (!href) return;

    // Check if this is a film link
    const vistaFilmId = extractVistaFilmId(href);
    if (vistaFilmId) {
      filmIds.add(vistaFilmId);
      currentFilmId = vistaFilmId;
      return;
    }

    // Check if this is a ticket link
    if (href.includes(TICKET_BASE_URL) && currentFilmId) {
      const timeText = $link.text().trim();
      if (timeText && timeText.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
        const time = parseTime(timeText);
        showtimes.push({
          vista_film_id: currentFilmId,
          date,
          time,
          ticket_url: href,
        });
      }
    }
  });

  return { filmIds, showtimes };
}

/**
 * Parses a date string like "Sat Jan 25" to "2026-01-25" format
 * Uses the current year context
 */
function parseDateHeader(dateText: string, referenceYear: number): string | null {
  const months: { [key: string]: string } = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  // Match patterns like "Sat Jan 25" or "Sun January 25"
  const match = dateText.toLowerCase().match(/(?:sun|mon|tue|wed|thu|fri|sat)\w*\s+(\w+)\s+(\d{1,2})/i);
  if (!match) return null;

  const monthName = match[1].substring(0, 3).toLowerCase();
  const day = match[2].padStart(2, "0");
  const month = months[monthName];

  if (!month) return null;

  return `${referenceYear}-${month}-${day}`;
}

/**
 * Scrapes showtimes from a film detail page
 * The detail page has cleaner showtime data organized by date headers
 */
async function scrapeShowtimesFromFilmPage(
  vistaFilmId: string,
  html: string,
  referenceYear: number
): Promise<ScrapedShowtime[]> {
  const $ = cheerio.load(html);
  const showtimes: ScrapedShowtime[] = [];

  // Showtimes on film detail page are organized as:
  // <h6>Sat Jan 25</h6>
  // <a href="ticket-url">4:15pm</a>
  // <a href="ticket-url">7:30pm</a>
  // <h6>Sun Jan 26</h6>
  // ...

  let currentDate: string | null = null;

  // Process h6 date headers and their following ticket links
  $("h6").each((_, dateEl) => {
    const dateText = $(dateEl).text().trim();
    const parsedDate = parseDateHeader(dateText, referenceYear);

    if (parsedDate) {
      currentDate = parsedDate;

      // Find all sibling ticket links until the next h6
      let $next = $(dateEl).next();
      while ($next.length > 0 && !$next.is("h6")) {
        // Check if this element or its children contain ticket links
        const $ticketLinks = $next.is("a") && $next.attr("href")?.includes(TICKET_BASE_URL)
          ? $next
          : $next.find(`a[href*="${TICKET_BASE_URL}"]`);

        $ticketLinks.each((_, linkEl) => {
          const $link = $(linkEl);
          const href = $link.attr("href");
          const timeText = $link.text().trim();

          if (href && timeText && currentDate) {
            const time = parseTime(timeText);
            showtimes.push({
              vista_film_id: vistaFilmId,
              date: currentDate,
              time,
              ticket_url: href,
            });
          }
        });

        $next = $next.next();
      }
    }
  });

  return showtimes;
}

/**
 * Generates an array of dates from start to end (inclusive)
 */
function getDateRange(startDate: Date, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Main scraper function
 *
 * @param options.startDate - Start date for scraping (defaults to today)
 * @param options.days - Number of days to scrape (defaults to 7)
 */
export async function scrapeMetrograph(options: {
  startDate?: Date;
  days?: number;
} = {}): Promise<ScrapeResult> {
  const { startDate = new Date(), days = 7 } = options;
  const referenceYear = startDate.getFullYear();

  console.log(`[Metrograph] Starting scrape for ${days} days from ${startDate.toISOString().split("T")[0]}`);

  const dates = getDateRange(startDate, days);
  const allFilmIds = new Set<string>();

  // First pass: collect all film IDs from calendar pages
  for (const date of dates) {
    console.log(`[Metrograph] Collecting film IDs for ${date}...`);
    try {
      const { filmIds } = await scrapeCalendarPage(date);
      filmIds.forEach((id) => allFilmIds.add(id));
      console.log(`[Metrograph] Found ${filmIds.size} films for ${date}`);
    } catch (error) {
      console.error(`[Metrograph] Error collecting films for ${date}:`, error);
    }

    // Small delay between requests to be polite
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`[Metrograph] Total unique films found: ${allFilmIds.size}`);

  // Second pass: scrape detailed info and showtimes from each film page
  const movies: ScrapedMovie[] = [];
  const allShowtimes: ScrapedShowtime[] = [];
  const filmIdArray = Array.from(allFilmIds);

  // Create a date range set for filtering showtimes
  const dateSet = new Set(dates);

  for (let i = 0; i < filmIdArray.length; i++) {
    const filmId = filmIdArray[i];
    console.log(`[Metrograph] Scraping film ${i + 1}/${filmIdArray.length}: ${filmId}...`);
    try {
      const result = await scrapeFilmDetail(filmId, referenceYear);
      movies.push(result.movie);

      // Filter showtimes to only include dates in our range
      const filteredShowtimes = result.showtimes.filter((st) => dateSet.has(st.date));
      allShowtimes.push(...filteredShowtimes);

      console.log(`[Metrograph] Scraped: ${result.movie.title} (${filteredShowtimes.length} showtimes)`);
    } catch (error) {
      console.error(`[Metrograph] Error scraping film ${filmId}:`, error);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`[Metrograph] Scrape complete. Movies: ${movies.length}, Showtimes: ${allShowtimes.length}`);

  return { movies, showtimes: allShowtimes };
}

// Export for direct execution
export default scrapeMetrograph;

// Allow running directly: npx tsx lib/scrapers/metrograph.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeMetrograph({ days: 1 })
    .then((result) => {
      console.log("\n=== SCRAPE RESULTS ===\n");
      console.log(`Movies: ${result.movies.length}`);
      console.log(`Showtimes: ${result.showtimes.length}`);

      // Create a map of film IDs to titles for display
      const filmTitles = new Map(result.movies.map((m) => [m.vista_film_id, m.title]));

      console.log("\n--- Sample Movies (first 5) ---");
      for (const movie of result.movies.slice(0, 5)) {
        console.log(`  ${movie.title}`);
        console.log(`    Year: ${movie.year ?? "N/A"}, Runtime: ${movie.runtime ?? "N/A"}min`);
        console.log(`    Director: ${movie.director ?? "N/A"}`);
        console.log(`    Description: ${movie.description?.substring(0, 100) ?? "N/A"}...`);
      }

      console.log("\n--- Sample Showtimes (first 10) ---");
      for (const showtime of result.showtimes.slice(0, 10)) {
        const title = filmTitles.get(showtime.vista_film_id) || showtime.vista_film_id;
        console.log(`  ${title}: ${showtime.date} @ ${showtime.time}`);
      }

      // Summary stats
      const moviesWithShowtimes = new Set(result.showtimes.map((s) => s.vista_film_id)).size;
      console.log("\n--- Summary ---");
      console.log(`  Total movies: ${result.movies.length}`);
      console.log(`  Movies with showtimes: ${moviesWithShowtimes}`);
      console.log(`  Total showtimes: ${result.showtimes.length}`);
    })
    .catch(console.error);
}
