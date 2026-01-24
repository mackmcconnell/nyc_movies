/**
 * IFC Center Scraper
 *
 * Scrapes movie listings and showtimes from https://www.ifccenter.com
 *
 * ## Site Structure (verified 2026-01-24)
 *
 * ### Homepage (https://www.ifccenter.com)
 * - Showtimes widget in sidebar: `.showtimes-widget`
 * - Day tabs: `.daily-schedule.sat`, `.daily-schedule.sun`, etc.
 * - Date header: `<h3>Sat Jan 24</h3>`
 * - Films in each day: `<li>` with `<h3><a href="/films/[slug]/">Title</a></h3>`
 * - Showtimes: `<ul class="times">` with `<li><a href="ticket-url">Time</a></li>`
 * - Time format: "11:30 AM", "6:40 PM"
 *
 * ### Film Detail Page (https://www.ifccenter.com/films/[slug]/)
 * - Title: `<h1 class="title">Title</h1>`
 * - Metadata in `<ul class="film-details">`:
 *   - `<li><strong>Director</strong> Name</li>`
 *   - `<li><strong>Running Time</strong> 163 minutes</li>`
 *   - `<li><strong>Country</strong> USA</li>`
 * - Description: paragraphs before `.film-details`
 * - Showtimes: `<ul class="schedule-list">` with date/time structure
 */

import * as cheerio from "cheerio";
import type { Movie, Showtime } from "../types";

const BASE_URL = "https://www.ifccenter.com";
const THEATER_SLUG = "ifc-center";

// Day abbreviations used on IFC Center
const DAY_ABBREVS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

// Types for scraper results (without database IDs)
export interface ScrapedMovie extends Omit<Movie, "id"> {
  slug: string; // URL slug for linking
}

export interface ScrapedShowtime extends Omit<Showtime, "id" | "movie_id" | "theater_id"> {
  slug: string; // Used to link to movie
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
 * Extracts slug from a film URL
 * Example: /films/magellan/ -> magellan
 */
function extractSlug(href: string): string | null {
  const match = href.match(/\/films\/([^/]+)\/?/);
  return match ? match[1] : null;
}

/**
 * Parses time string like "11:30 AM" or "6:40 PM" to 24-hour format "HH:MM"
 */
function parseTime(timeStr: string): string {
  const match = timeStr.trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!match) {
    return timeStr;
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
 * Parses a date header like "Sat Jan 24" to "YYYY-MM-DD" format
 */
function parseDateHeader(dateText: string, referenceYear: number): string | null {
  const months: { [key: string]: string } = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  // Match "Sat Jan 24" or "Sun January 25"
  const match = dateText.toLowerCase().match(/(?:sun|mon|tue|wed|thu|fri|sat)\w*\s+(\w+)\s+(\d{1,2})/i);
  if (!match) return null;

  const monthName = match[1].substring(0, 3).toLowerCase();
  const day = match[2].padStart(2, "0");
  const month = months[monthName];

  if (!month) return null;

  return `${referenceYear}-${month}-${day}`;
}

/**
 * Parses runtime string like "163 minutes" to number 163
 */
function parseRuntime(runtimeStr: string): number | null {
  const match = runtimeStr.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Scrapes film details from a film detail page
 */
async function scrapeFilmDetail(slug: string): Promise<ScrapedMovie | null> {
  const url = `${BASE_URL}/films/${slug}/`;

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Title: <h1 class="title">Title</h1>
    const title = $("h1.title").first().text().trim();
    if (!title) {
      console.log(`[IFC Center] No title found for ${slug}`);
      return null;
    }

    // Metadata from <ul class="film-details">
    let director: string | null = null;
    let runtime: number | null = null;

    $("ul.film-details li").each((_, el) => {
      const $li = $(el);
      const label = $li.find("strong").text().trim().toLowerCase();
      // Get text after the strong tag
      const value = $li.text().replace($li.find("strong").text(), "").trim();

      if (label === "director") {
        director = value || null;
      } else if (label === "running time") {
        runtime = parseRuntime(value);
      }
    });

    // Description: Look for the main content paragraphs
    // They appear before the film-details list
    let description: string | null = null;
    const contentParagraphs: string[] = [];

    // The description is in the main content area, typically in paragraphs
    // Look for substantial paragraphs in the ifc-col section
    $(".ifc-col-2 > p, .ifc-main p").each((_, el) => {
      const text = $(el).text().trim();
      // Skip short paragraphs, date headers, and event info
      if (
        text.length > 100 &&
        !text.match(/^(sat|sun|mon|tue|wed|thu|fri)/i) &&
        !text.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)/i) &&
        !text.match(/Q&A/i)
      ) {
        contentParagraphs.push(text);
      }
    });

    if (contentParagraphs.length > 0) {
      description = contentParagraphs[0];
    }

    // Trailer URL: Look for YouTube/Vimeo embeds
    let trailerUrl: string | null = null;
    $("iframe").each((_, el) => {
      const src = $(el).attr("src");
      if (src && (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com"))) {
        trailerUrl = src;
      }
    });

    // Image: Look for og:image meta tag or poster images
    let imageUrl: string | null = null;
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
      imageUrl = ogImage;
    }
    // Fallback: look for film poster
    if (!imageUrl) {
      const posterImg = $(".film-poster img, .poster img, .ifc-col img").first().attr("src");
      if (posterImg) {
        imageUrl = posterImg.startsWith("http") ? posterImg : `${BASE_URL}${posterImg}`;
      }
    }

    return {
      title,
      director,
      year: null, // IFC Center doesn't consistently show year
      runtime,
      description,
      trailer_url: trailerUrl,
      image_url: imageUrl,
      slug,
    };
  } catch (error) {
    console.error(`[IFC Center] Error scraping film ${slug}:`, error);
    return null;
  }
}

/**
 * Scrapes showtimes from the homepage
 * Returns a map of film slugs to their showtimes
 */
async function scrapeHomepageShowtimes(referenceYear: number): Promise<{
  slugs: Set<string>;
  showtimes: ScrapedShowtime[];
}> {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);

  const slugs = new Set<string>();
  const showtimes: ScrapedShowtime[] = [];

  // Process each day's schedule
  DAY_ABBREVS.forEach((day) => {
    const $daySchedule = $(`.daily-schedule.${day}`);
    if ($daySchedule.length === 0) return;

    // Get the date from the header
    const dateHeader = $daySchedule.find("h3").first().text().trim();
    const date = parseDateHeader(dateHeader, referenceYear);

    if (!date) {
      console.log(`[IFC Center] Could not parse date: ${dateHeader}`);
      return;
    }

    // Process each film in this day's schedule
    $daySchedule.find("> ul > li").each((_, filmEl) => {
      const $film = $(filmEl);

      // Get film link and slug
      const $filmLink = $film.find(".details h3 a").first();
      const filmHref = $filmLink.attr("href");
      if (!filmHref) return;

      const slug = extractSlug(filmHref);
      if (!slug) return;

      slugs.add(slug);

      // Get showtimes for this film
      $film.find("ul.times li a").each((_, timeEl) => {
        const $time = $(timeEl);
        const timeText = $time.text().trim();
        const ticketUrl = $time.attr("href") || null;

        // Parse time - handle formats like "11:30 AM " or "6:40 PM "
        const time = parseTime(timeText);
        if (!time.match(/^\d{2}:\d{2}$/)) {
          return; // Skip if parsing failed
        }

        showtimes.push({
          slug,
          date,
          time,
          ticket_url: ticketUrl,
        });
      });
    });
  });

  return { slugs, showtimes };
}

/**
 * Main scraper function
 */
export async function scrapeIFCCenter(): Promise<ScrapeResult> {
  const referenceYear = new Date().getFullYear();

  console.log("[IFC Center] Starting scrape...");

  // First, get all showtimes and film slugs from the homepage
  console.log("[IFC Center] Scraping homepage for showtimes...");
  const { slugs, showtimes } = await scrapeHomepageShowtimes(referenceYear);

  console.log(`[IFC Center] Found ${slugs.size} films with ${showtimes.length} showtimes`);

  // Then, scrape details for each film
  const movies: ScrapedMovie[] = [];
  const slugArray = Array.from(slugs);

  for (let i = 0; i < slugArray.length; i++) {
    const slug = slugArray[i];
    console.log(`[IFC Center] Scraping film ${i + 1}/${slugArray.length}: ${slug}...`);

    const movie = await scrapeFilmDetail(slug);
    if (movie) {
      movies.push(movie);
      console.log(`[IFC Center] Scraped: ${movie.title}`);
    }

    // Small delay between requests to be polite
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`[IFC Center] Scrape complete. Movies: ${movies.length}, Showtimes: ${showtimes.length}`);

  return { movies, showtimes };
}

// Export for direct execution
export default scrapeIFCCenter;

// Allow running directly: npx tsx lib/scrapers/ifccenter.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeIFCCenter()
    .then((result) => {
      console.log("\n=== SCRAPE RESULTS ===\n");
      console.log(`Movies: ${result.movies.length}`);
      console.log(`Showtimes: ${result.showtimes.length}`);

      // Create a map of slugs to titles for display
      const filmTitles = new Map(result.movies.map((m) => [m.slug, m.title]));

      console.log("\n--- Movies ---");
      for (const movie of result.movies) {
        console.log(`  ${movie.title}`);
        console.log(`    Slug: ${movie.slug}`);
        console.log(`    Director: ${movie.director ?? "N/A"}`);
        console.log(`    Runtime: ${movie.runtime ?? "N/A"} min`);
        console.log(`    Description: ${movie.description?.substring(0, 100) ?? "N/A"}...`);
      }

      console.log("\n--- Sample Showtimes (first 20) ---");
      for (const showtime of result.showtimes.slice(0, 20)) {
        const title = filmTitles.get(showtime.slug) || showtime.slug;
        console.log(`  ${title}: ${showtime.date} @ ${showtime.time}`);
      }

      // Summary stats
      const moviesWithShowtimes = new Set(result.showtimes.map((s) => s.slug)).size;
      console.log("\n--- Summary ---");
      console.log(`  Total movies: ${result.movies.length}`);
      console.log(`  Movies with showtimes: ${moviesWithShowtimes}`);
      console.log(`  Total showtimes: ${result.showtimes.length}`);
    })
    .catch(console.error);
}
