/**
 * Film Forum Scraper
 *
 * Scrapes movie listings and showtimes from filmforum.org
 *
 * Site structure analysis (verified 2026-06-09):
 * - Homepage/schedule page: Has JSON-LD with ScreeningEvent objects but startDate/endDate are empty
 * - Film detail pages at: /film/[slug] contain:
 *   - JSON-LD with offers.url for ticket links (https://my.filmforum.org/events/[slug])
 *   - HTML with director, year, runtime in metadata section
 *   - Showtimes in tab-based structure (#tabs-0 through #tabs-6), one tab per day
 *   - IMPORTANT: tabs are a rolling 7-day window starting TODAY (e.g. on a
 *     Tuesday: #tabs-0=TUE ... #tabs-6=MON), NOT a fixed Saturday-first week.
 *     Each tab's day is read from its nav label <a href="#tabs-N">DAY</a>.
 *   - IMPORTANT: Each tab contains ALL movies for that day, not just the current movie
 *   - Movie showtimes are listed next to their title link within each tab
 */

import * as cheerio from "cheerio";
import { Movie, Showtime } from "../types";
import { getTheaterBySlug } from "../queries-local";

const BASE_URL = "https://filmforum.org";
const THEATER_SLUG = "film-forum";

interface ScrapedMovie {
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  description: string | null;
  trailer_url: string | null;
  image_url: string | null;
  slug: string;
  sourceUrl: string;
}

interface ScrapedShowtime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  ticket_url: string | null;
}

interface ScrapedFilm {
  movie: ScrapedMovie;
  showtimes: ScrapedShowtime[];
}

interface JsonLdScreeningEvent {
  "@type": string;
  name?: string;
  url?: string;
  offers?: Array<{ url?: string }> | { url?: string };
  workPresented?: {
    name?: string;
    director?: string;
  };
}

interface JsonLdCollectionPage {
  "@type": string;
  name?: string;
  mainEntity?: {
    itemListElement?: Array<{ item?: JsonLdScreeningEvent }>;
  };
}

/**
 * Fetch a page and return cheerio instance
 */
async function fetchPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  return cheerio.load(html);
}

/**
 * Extract JSON-LD data from a page
 */
function extractJsonLd($: ReturnType<typeof cheerio.load>): unknown[] {
  const jsonLdScripts: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (content) {
        jsonLdScripts.push(JSON.parse(content));
      }
    } catch {
      // Skip invalid JSON
    }
  });

  return jsonLdScripts;
}

/**
 * Get all film URLs from the homepage
 */
async function getFilmUrls(): Promise<string[]> {
  const $ = await fetchPage(BASE_URL);
  const filmUrls = new Set<string>();

  // Extract from JSON-LD
  const jsonLdData = extractJsonLd($);
  for (const data of jsonLdData) {
    const collection = data as JsonLdCollectionPage;
    if (collection.mainEntity?.itemListElement) {
      for (const item of collection.mainEntity.itemListElement) {
        if (item.item?.url && item.item.url.includes("/film/")) {
          filmUrls.add(item.item.url);
        }
      }
    }
  }

  // Also extract from HTML links
  $('a[href*="/film/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.includes("film-forum-jr") && !href.includes("#")) {
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      filmUrls.add(fullUrl);
    }
  });

  return Array.from(filmUrls);
}

/**
 * Parse movie metadata from a film detail page
 * The HTML structure has metadata in a specific format:
 * "DIRECTED BY [NAME]" followed by year/runtime/country info
 */
function parseMovieMetadata(
  $: ReturnType<typeof cheerio.load>
): Pick<ScrapedMovie, "director" | "year" | "runtime" | "description"> {
  let director: string | null = null;
  let year: number | null = null;
  let runtime: number | null = null;
  let description: string | null = null;

  // Get all text content and look for patterns
  const bodyText = $("body").text();

  // Look for "DIRECTED BY [NAME]" pattern
  // The director name ends before WRITTEN, PRODUCED, WITH, a year, or newline
  const directorMatch = bodyText.match(/DIRECTED BY\s+([A-Z][A-Za-z\s.'-]+?)(?=\s*(?:WRITTEN|PRODUCED|WITH|EXECUTIVE|\d{4}|\n|$))/i);
  if (directorMatch) {
    director = directorMatch[1].trim();
    // Remove trailing spaces and common suffixes
    director = director.replace(/\s+$/, "");
  }

  // Look for year pattern (4-digit year followed by runtime)
  // Format is typically: "2025     123 MIN.     USA"
  const yearRuntimeMatch = bodyText.match(/(\d{4})\s+(\d+)\s*MIN/i);
  if (yearRuntimeMatch) {
    year = parseInt(yearRuntimeMatch[1], 10);
    runtime = parseInt(yearRuntimeMatch[2], 10);
  }

  // The film synopsis lives inside <div class="copy">. Scope to it: a bare
  // $("p") scan picks up the theater <address> block (209 West Houston St...)
  // that appears earlier in the DOM and is long enough to pass a length filter.
  $("div.copy p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 50 && !description) {
      description = text;
    }
  });

  return { director, year, runtime, description };
}

/**
 * Calculate the dates for Film Forum's showtime tabs.
 *
 * The site renders a rolling 7-day window of day tabs starting with TODAY
 * (e.g. on a Tuesday the tabs read TUE, WED, THU, FRI, SAT, SUN, MON), not a
 * fixed Saturday-first week. We therefore map each day-of-week abbreviation to
 * its concrete date across the next 7 days. parseShowtimes() then resolves each
 * tab to a date by reading that tab's actual day label rather than assuming a
 * fixed tab-index-to-weekday order.
 */
function calculateWeekDates(referenceDate: Date = new Date()): Map<string, string> {
  const dateMap = new Map<string, string>();

  // JS Date.getDay(): 0 = Sunday ... 6 = Saturday
  const dayAbbrevByIndex = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Map the next 7 days (today through today+6) by their weekday abbreviation.
  // Seven consecutive days cover each weekday exactly once.
  for (let i = 0; i < 7; i++) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const abbrev = dayAbbrevByIndex[date.getDay()];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dateMap.set(abbrev, `${year}-${month}-${day}`);
  }

  return dateMap;
}

/**
 * Convert 12-hour time to 24-hour format
 * Film Forum uses 12-hour format without AM/PM
 * Heuristic: times 1-9 are PM (13:00-21:00), 10-12 are as-is (morning/noon)
 */
function convertTo24Hour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  let hour24 = hours;

  // Times 1-9 are afternoon/evening (add 12)
  if (hours >= 1 && hours <= 9) {
    hour24 = hours + 12;
  }
  // 10, 11, 12 stay as-is (morning shows or noon)

  return `${hour24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Parse showtimes from a film detail page for a specific movie
 *
 * HTML Structure (verified 2026-01-24):
 * - Each tab (#tabs-0 through #tabs-6 for SAT-FRI) contains ALL movies for that day
 * - Each movie entry is a <p> containing:
 *   - <strong><a href="/film/[slug]">TITLE</a></strong>
 *   - <br>
 *   - Multiple <span> elements with times: <span>12:30</span> <span>3:00(OC)</span>
 * - We find the <p> containing the link to THIS movie and extract times from its <span> children
 */
function parseShowtimes(
  $: ReturnType<typeof cheerio.load>,
  ticketUrl: string | null,
  weekDates: Map<string, string>,
  movieSlug: string
): ScrapedShowtime[] {
  const showtimes: ScrapedShowtime[] = [];

  // Look for tab panels containing showtimes.
  // The site renders 7 day tabs (#tabs-0..#tabs-6) starting from today, so the
  // tab index no longer maps to a fixed weekday. Resolve each tab's date by
  // reading its actual nav label (e.g. <a href="#tabs-3">FRI</a>).
  for (let i = 0; i < 7; i++) {
    const tabContent = $(`#tabs-${i}`);
    if (tabContent.length === 0) continue;

    const dayAbbrev = $(`a[href="#tabs-${i}"]`).first().text().trim().toUpperCase();
    const date = weekDates.get(dayAbbrev);
    if (!date) continue;

    // Find the link to this movie within the tab
    // The link href contains the movie slug: /film/[slug]
    const movieLink = tabContent.find(`a[href*="/film/${movieSlug}"]`);

    if (movieLink.length > 0) {
      // Navigate up to the <p> element which contains both the title and the time <span>s
      // Structure: p > strong > a
      const paragraph = movieLink.closest("p");

      if (paragraph.length > 0) {
        // Find all <span> elements within this paragraph - these contain the showtimes
        paragraph.find("span").each((_, span) => {
          const spanText = $(span).text().trim();

          // Extract time from span (format: "12:30" or "3:00(OC)")
          const timeMatch = spanText.match(/^(\d{1,2}:\d{2})/);
          if (timeMatch) {
            const time24 = convertTo24Hour(timeMatch[1]);

            // Avoid duplicates
            const existing = showtimes.find(
              (s) => s.date === date && s.time === time24
            );
            if (!existing) {
              showtimes.push({
                date,
                time: time24,
                ticket_url: ticketUrl,
              });
            }
          }
        });
      }
    }
  }

  return showtimes;
}

/**
 * Scrape a single film detail page
 */
async function scrapeFilmPage(url: string, weekDates: Map<string, string>): Promise<ScrapedFilm | null> {
  try {
    const $ = await fetchPage(url);

    // Check if it's a 404 page
    const pageText = $("body").text();
    if (pageText.includes("we can't find that page") || pageText.includes("404")) {
      console.log(`Skipping 404 page: ${url}`);
      return null;
    }

    // Extract JSON-LD data for title and ticket URL
    const jsonLdData = extractJsonLd($);
    let title = "";
    let ticketUrl: string | null = null;

    for (const data of jsonLdData) {
      const event = data as JsonLdScreeningEvent;
      if (event["@type"] === "ScreeningEvent") {
        title = event.name || "";

        // Get ticket URL from offers
        if (event.offers) {
          if (Array.isArray(event.offers)) {
            ticketUrl = event.offers[0]?.url || null;
          } else {
            ticketUrl = event.offers.url || null;
          }
        }
      }
    }

    // Fallback: get title from page title or h1
    if (!title) {
      title = $("h1").first().text().trim() || $("title").text().split("|")[0].trim();
    }

    if (!title) {
      console.log(`No title found for: ${url}`);
      return null;
    }

    // Extract slug from URL
    const slug = url.split("/film/")[1]?.split("?")[0] || "";

    // Parse metadata from HTML
    const metadata = parseMovieMetadata($);

    // Parse showtimes for this specific movie (using the slug to identify it in tabs)
    const showtimes = parseShowtimes($, ticketUrl, weekDates, slug);

    // Trailer: in-release films embed a YouTube trailer in <div class="flex-video">
    // under <h3 id="trailer">. Scope to it so the GTM iframe and the footer
    // "Film Forum on YouTube" channel link are not mistaken for a trailer.
    let trailerUrl: string | null = null;
    const trailerSrc =
      $('div.flex-video iframe[src*="youtube"], div.flex-video iframe[src*="youtu.be"], div.flex-video iframe[src*="vimeo"]').attr("src") ||
      $("h3#trailer").nextAll(".audio-container").find("iframe").attr("src") ||
      null;
    if (trailerSrc && /youtube\.com\/embed|youtu\.be|vimeo\.com|youtube-nocookie/.test(trailerSrc)) {
      trailerUrl = trailerSrc.startsWith("//") ? `https:${trailerSrc}` : trailerSrc;
    }

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

    const movie: ScrapedMovie = {
      title: cleanTitle(title),
      director: metadata.director,
      year: metadata.year,
      runtime: metadata.runtime,
      description: metadata.description,
      trailer_url: trailerUrl,
      image_url: imageUrl,
      slug,
      sourceUrl: url,
    };

    return { movie, showtimes };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Clean up film titles
 * - Remove HTML tags like <br>
 * - Optionally remove director name prefixes like "Luchino Visconti's "
 * - Normalize whitespace
 */
function cleanTitle(title: string): string {
  // Remove HTML tags
  let cleaned = title.replace(/<[^>]*>/g, " ");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove common prefixes like "Luchino Visconti's " or "Satyajit Ray's "
  // Pattern: [FirstName] [LastName]'s [TITLE]
  const prefixMatch = cleaned.match(
    /^([A-Z][a-z]+\s+(?:von\s+)?[A-Z][a-z]+(?:['']s)?)\s+(.+)$/
  );
  if (prefixMatch) {
    const potentialTitle = prefixMatch[2];
    // Only use the clean title if it starts with uppercase (it's actually the title)
    if (potentialTitle && /^[A-Z]/.test(potentialTitle)) {
      cleaned = potentialTitle;
    }
  }

  // Also handle "Giuseppe De Santis' BITTER RICE" pattern
  const deMatch = cleaned.match(
    /^([A-Z][a-z]+\s+[Dd]e\s+[A-Z][a-z]+(?:[''])?)\s+(.+)$/
  );
  if (deMatch) {
    const potentialTitle = deMatch[2];
    if (potentialTitle && /^[A-Z]/.test(potentialTitle)) {
      cleaned = potentialTitle;
    }
  }

  return cleaned;
}

/**
 * Main scraper function - scrapes Film Forum and returns movie/showtime data
 */
export async function scrapeFilmForum(): Promise<{
  movies: Omit<Movie, "id">[];
  showtimes: Omit<Showtime, "id" | "movie_id">[];
  movieShowtimeMap: Map<string, number[]>; // Maps movie title to showtime indices
}> {
  const theater = getTheaterBySlug(THEATER_SLUG);
  if (!theater) {
    throw new Error(`Theater not found: ${THEATER_SLUG}`);
  }

  console.log("Fetching film URLs from Film Forum...");
  const filmUrls = await getFilmUrls();
  console.log(`Found ${filmUrls.length} film URLs`);

  const weekDates = calculateWeekDates();
  console.log("Week dates:", Object.fromEntries(weekDates));

  const movies: Omit<Movie, "id">[] = [];
  const showtimes: Omit<Showtime, "id" | "movie_id">[] = [];
  const movieShowtimeMap = new Map<string, number[]>();

  // Scrape each film page
  for (const url of filmUrls) {
    console.log(`Scraping: ${url}`);
    const result = await scrapeFilmPage(url, weekDates);

    if (result && result.showtimes.length > 0) {
      const movieData: Omit<Movie, "id"> = {
        title: result.movie.title,
        director: result.movie.director,
        year: result.movie.year,
        runtime: result.movie.runtime,
        description: result.movie.description,
        trailer_url: result.movie.trailer_url,
        image_url: result.movie.image_url,
      };

      movies.push(movieData);

      // Track showtime indices for this movie
      const showtimeIndices: number[] = [];

      for (const showtime of result.showtimes) {
        showtimeIndices.push(showtimes.length);
        showtimes.push({
          theater_id: theater.id,
          date: showtime.date,
          time: showtime.time,
          ticket_url: showtime.ticket_url,
        });
      }

      movieShowtimeMap.set(result.movie.title, showtimeIndices);
    }

    // Be polite to the server
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Scraped ${movies.length} movies with ${showtimes.length} showtimes`);

  return { movies, showtimes, movieShowtimeMap };
}

/**
 * Run scraper as standalone script
 */
if (require.main === module) {
  scrapeFilmForum()
    .then(({ movies, showtimes }) => {
      console.log("\n=== Scrape Results ===");
      console.log(`Movies: ${movies.length}`);
      console.log(`Showtimes: ${showtimes.length}`);

      console.log("\nMovies:");
      for (const movie of movies) {
        console.log(`  - ${movie.title}`);
        if (movie.director) console.log(`    Director: ${movie.director}`);
        if (movie.year) console.log(`    Year: ${movie.year}`);
        if (movie.runtime) console.log(`    Runtime: ${movie.runtime} min`);
      }

      console.log("\nShowtimes:");
      for (const showtime of showtimes.slice(0, 10)) {
        console.log(`  ${showtime.date} ${showtime.time} - ${showtime.ticket_url}`);
      }
      if (showtimes.length > 10) {
        console.log(`  ... and ${showtimes.length - 10} more`);
      }
    })
    .catch(console.error);
}
