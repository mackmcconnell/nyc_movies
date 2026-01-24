/**
 * Quad Cinema Scraper
 *
 * Scrapes movie listings and showtimes from https://quadcinema.com
 *
 * ## Site Structure (verified 2026-01-24)
 *
 * ### Homepage (https://quadcinema.com)
 * - Day containers: <div class="day-wrap date-XX"> where XX is the day of month
 * - Movie items inside: <div class="col span_3 grid-item">
 * - Title link: <h4><a href="/film/[slug]/">Title</a></h4>
 * - Showtimes: <ul class="showtimes-list"> with <li><a href="fandango-url?date=YYYY-MM-DD">time</a></li>
 * - Time format: "12.45pm" (dot separator, 12-hour format)
 *
 * ### Film Detail Page (https://quadcinema.com/film/[slug]/)
 * - JSON-LD Movie schema with director
 * - Year/runtime in metadata: <p>2025, 149m, DCP, U.S.</p>
 * - Trailer: YouTube iframe in synopsis
 * - Director: JSON-LD or credits section with "A film by" label
 * - Synopsis: <div class="synopsis"><div class="section"><p>...</p></div></div>
 */

import * as cheerio from "cheerio";
import type { Movie, Showtime } from "../types";

const BASE_URL = "https://quadcinema.com";

// Types for scraper results (without database IDs)
export interface ScrapedMovie extends Omit<Movie, "id"> {
  slug: string; // URL slug for linking to movie
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
 * Parses time string like "12.45pm" or "6.30pm" to 24-hour format "12:45" or "18:30"
 * Quad Cinema uses dot separator instead of colon
 */
function parseTime(timeStr: string): string {
  // Normalize: replace dot with colon and handle formats like "12.45pm", "6.30pm"
  const normalized = timeStr.toLowerCase().replace(".", ":");
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
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
 * Extract date from Fandango URL
 * Example: http://www.fandango.com/quadcinema_aaefp/theaterpage?date=2026-01-24
 */
function extractDateFromUrl(url: string): string | null {
  const match = url.match(/date=(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Extract slug from film URL
 * Example: /film/marty-supreme/ -> marty-supreme
 */
function extractSlug(href: string): string | null {
  const match = href.match(/\/film\/([^/]+)\/?/);
  return match ? match[1] : null;
}

/**
 * Parse year and runtime from metadata line
 * Example: "2025, 149m, DCP, U.S." -> { year: 2025, runtime: 149 }
 */
function parseYearRuntime(text: string): { year: number | null; runtime: number | null } {
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  const runtimeMatch = text.match(/(\d+)m\b/);

  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    runtime: runtimeMatch ? parseInt(runtimeMatch[1], 10) : null,
  };
}

/**
 * Interface for JSON-LD Movie schema
 */
interface MovieJsonLd {
  "@type": string;
  name?: string;
  director?: {
    "@type": string;
    name: string;
  };
}

/**
 * Scrapes detailed movie information from a film detail page
 */
async function scrapeFilmDetail(slug: string): Promise<Omit<ScrapedMovie, "slug"> | null> {
  try {
    const url = `${BASE_URL}/film/${slug}/`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Title from h1.film-title
    const title = $("h1.film-title").text().trim();
    if (!title) {
      return null;
    }

    // Try to get director from JSON-LD first
    let director: string | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonLd = JSON.parse($(el).html() || "{}") as MovieJsonLd;
        if (jsonLd["@type"] === "Movie" && jsonLd.director?.name) {
          director = jsonLd.director.name;
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    // Fallback: get director from credits section
    if (!director) {
      $(".credit-item").each((_, el) => {
        const label = $(el).find(".credit-label").text().trim().toLowerCase();
        if (label === "a film by" || label === "directed by") {
          director = $(el).find(".credit-name").first().text().trim() || null;
        }
      });
    }

    // Get year and runtime from metadata paragraph
    // Look for the paragraph in .film-info section with format "2025, 149m, DCP, U.S."
    let year: number | null = null;
    let runtime: number | null = null;

    $(".film-info p").each((_, el) => {
      const text = $(el).text().trim();
      // Check if this looks like a metadata line (contains year and runtime pattern)
      if (text.match(/\d{4},\s*\d+m/)) {
        const parsed = parseYearRuntime(text);
        year = parsed.year;
        runtime = parsed.runtime;
      }
    });

    // Get description from synopsis section
    let description: string | null = null;
    const synopsisParagraphs = $(".synopsis .section p");
    if (synopsisParagraphs.length > 0) {
      // Get first paragraph that doesn't contain Open Caption or iframe info
      synopsisParagraphs.each((_, el) => {
        const text = $(el).text().trim();
        if (!description && text.length > 20 && !text.toLowerCase().includes("open caption") && !$(el).find("iframe").length) {
          description = text;
        }
      });
    }

    // Get trailer URL from YouTube iframe
    let trailerUrl: string | null = null;
    $("iframe").each((_, el) => {
      const src = $(el).attr("src");
      if (src && (src.includes("youtube.com") || src.includes("youtu.be"))) {
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
      const posterImg = $(".film-poster img, .poster img, .film-image img").first().attr("src");
      if (posterImg) {
        imageUrl = posterImg.startsWith("http") ? posterImg : `${BASE_URL}${posterImg}`;
      }
    }

    return {
      title,
      director,
      year,
      runtime,
      description,
      trailer_url: trailerUrl,
      image_url: imageUrl,
    };
  } catch (error) {
    console.error(`[QuadCinema] Error scraping film detail ${slug}:`, error);
    return null;
  }
}

/**
 * Scrapes showtimes and film slugs from the homepage
 */
async function scrapeHomepageShowtimes(): Promise<{
  showtimes: ScrapedShowtime[];
  filmSlugs: Set<string>;
}> {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);

  const showtimes: ScrapedShowtime[] = [];
  const filmSlugs = new Set<string>();

  // Process each day section
  $(".day-wrap").each((_, dayWrap) => {
    // Process each movie in this day
    $(dayWrap)
      .find(".col.grid-item")
      .each((_, movieItem) => {
        // Get film link and extract slug
        const filmLink = $(movieItem).find("h4 a").attr("href");
        if (!filmLink) return;

        const slug = extractSlug(filmLink);
        if (!slug) return;

        filmSlugs.add(slug);

        // Get all showtimes for this movie
        $(movieItem)
          .find(".showtimes-list li a")
          .each((_, timeLink) => {
            const $link = $(timeLink);
            const href = $link.attr("href");
            const timeText = $link.text().trim();

            if (!href || !timeText) return;

            const date = extractDateFromUrl(href);
            if (!date) return;

            const time = parseTime(timeText);

            showtimes.push({
              slug,
              date,
              time,
              ticket_url: href,
            });
          });
      });
  });

  return { showtimes, filmSlugs };
}

/**
 * Main scraper function
 */
export async function scrapeQuadCinema(): Promise<ScrapeResult> {
  console.log("[QuadCinema] Starting scrape...");

  // First, scrape the homepage to get all showtimes and film slugs
  console.log("[QuadCinema] Scraping homepage for showtimes...");
  const { showtimes, filmSlugs } = await scrapeHomepageShowtimes();
  console.log(`[QuadCinema] Found ${showtimes.length} showtimes for ${filmSlugs.size} films`);

  // Then, scrape each film detail page for movie metadata
  const movies: ScrapedMovie[] = [];
  const slugArray = Array.from(filmSlugs);

  for (let i = 0; i < slugArray.length; i++) {
    const slug = slugArray[i];
    console.log(`[QuadCinema] Scraping film ${i + 1}/${slugArray.length}: ${slug}...`);

    const movieData = await scrapeFilmDetail(slug);
    if (movieData) {
      movies.push({
        ...movieData,
        slug,
      });
      console.log(`[QuadCinema] Scraped: ${movieData.title}`);
    }

    // Small delay between requests to be polite
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`[QuadCinema] Scrape complete. Movies: ${movies.length}, Showtimes: ${showtimes.length}`);

  return { movies, showtimes };
}

// Export for direct execution
export default scrapeQuadCinema;

// Allow running directly: npx tsx lib/scrapers/quadcinema.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeQuadCinema()
    .then((result) => {
      console.log("\n=== SCRAPE RESULTS ===\n");
      console.log(`Movies: ${result.movies.length}`);
      console.log(`Showtimes: ${result.showtimes.length}`);

      // Create a map of slugs to titles for display
      const filmTitles = new Map(result.movies.map((m) => [m.slug, m.title]));

      console.log("\n--- Movies ---");
      for (const movie of result.movies) {
        console.log(`  ${movie.title}`);
        console.log(`    Year: ${movie.year ?? "N/A"}, Runtime: ${movie.runtime ?? "N/A"}min`);
        console.log(`    Director: ${movie.director ?? "N/A"}`);
        console.log(`    Description: ${movie.description?.substring(0, 100) ?? "N/A"}...`);
        console.log(`    Trailer: ${movie.trailer_url ?? "N/A"}`);
      }

      console.log("\n--- Sample Showtimes (first 15) ---");
      for (const showtime of result.showtimes.slice(0, 15)) {
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
