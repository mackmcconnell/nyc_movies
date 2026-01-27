/**
 * Film Noir Cinema Scraper
 *
 * Scrapes event listings from https://www.filmnoircinema.com
 *
 * ## Site Structure (verified 2026-01-27)
 *
 * ### Program Page (https://www.filmnoircinema.com/program)
 * - Built on Squarespace with events collection
 * - Event list: `.eventlist-event--upcoming`
 * - Event title: `.eventlist-title-link`
 * - Event date: `time.event-date[datetime]`
 * - Event time: `time.event-time-24hr-start`
 * - Event description: `.eventlist-description .sqs-html-content`
 *
 * Note: Film Noir Cinema shows themed event nights (Film Noir Monday, Cult Cinema, etc.)
 * rather than specific movie titles. Each event is treated as a "movie" entry.
 */

import * as cheerio from "cheerio";
import type { Movie, Showtime } from "../types";

const BASE_URL = "https://www.filmnoircinema.com";
const PROGRAM_URL = `${BASE_URL}/program`;

// Types for scraper results (without database IDs)
export interface ScrapedMovie extends Omit<Movie, "id"> {
  slug: string;
}

export interface ScrapedShowtime extends Omit<Showtime, "id" | "movie_id" | "theater_id"> {
  slug: string;
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
 * Creates a URL-friendly slug from a title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parses time string like "21:00" to "HH:MM" format
 */
function parseTime(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return timeStr;
  }
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * Scrapes events from the program page
 */
async function scrapeProgram(): Promise<ScrapeResult> {
  const html = await fetchPage(PROGRAM_URL);
  const $ = cheerio.load(html);

  const movies: ScrapedMovie[] = [];
  const showtimes: ScrapedShowtime[] = [];
  const seenSlugs = new Set<string>();

  // Get today's date as YYYY-MM-DD string for comparison
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Process each upcoming event
  $(".eventlist-event--upcoming").each((_, eventEl) => {
    const $event = $(eventEl);

    // Get title
    const title = $event.find(".eventlist-title-link").text().trim();
    if (!title) return;

    // Get date from datetime attribute
    const dateAttr = $event.find("time.event-date").attr("datetime");
    if (!dateAttr) return;

    // Skip past events (compare strings to avoid timezone issues)
    if (dateAttr < todayStr) return;

    // Get time (24hr format)
    const timeStr = $event.find("time.event-time-24hr-start").text().trim();
    const time = parseTime(timeStr);
    if (!time.match(/^\d{2}:\d{2}$/)) return;

    // Get description
    const description = $event.find(".eventlist-description .sqs-html-content p").first().text().trim() || null;

    // Get event URL for potential detail scraping
    const eventHref = $event.find(".eventlist-title-link").attr("href") || "";

    // Create slug from title
    const slug = createSlug(title);

    // Add movie if not already seen
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      movies.push({
        title,
        director: null,
        year: null,
        runtime: null,
        description,
        trailer_url: null,
        image_url: null,
        slug,
      });
    }

    // Add showtime
    showtimes.push({
      slug,
      date: dateAttr,
      time,
      ticket_url: eventHref ? `${BASE_URL}${eventHref}` : null,
    });
  });

  return { movies, showtimes };
}

/**
 * Main scraper function
 */
export async function scrapeFilmNoirCinema(): Promise<ScrapeResult> {
  console.log("[Film Noir Cinema] Starting scrape...");

  const result = await scrapeProgram();

  console.log(`[Film Noir Cinema] Scrape complete. Movies: ${result.movies.length}, Showtimes: ${result.showtimes.length}`);

  return result;
}

// Export for direct execution
export default scrapeFilmNoirCinema;

// Allow running directly: npx tsx lib/scrapers/filmnoircinema.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeFilmNoirCinema()
    .then((result) => {
      console.log("\n=== SCRAPE RESULTS ===\n");
      console.log(`Movies: ${result.movies.length}`);
      console.log(`Showtimes: ${result.showtimes.length}`);

      console.log("\n--- Movies ---");
      for (const movie of result.movies) {
        console.log(`  ${movie.title}`);
        console.log(`    Slug: ${movie.slug}`);
        console.log(`    Description: ${movie.description?.substring(0, 100) ?? "N/A"}...`);
      }

      console.log("\n--- Showtimes ---");
      for (const showtime of result.showtimes) {
        console.log(`  ${showtime.slug}: ${showtime.date} @ ${showtime.time}`);
      }
    })
    .catch(console.error);
}
