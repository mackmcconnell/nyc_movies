/**
 * Scrape orchestrator script
 *
 * Runs all theater scrapers and saves data to the database.
 *
 * Usage: npx tsx scripts/scrape.ts
 */

import { localDb } from "../lib/db-local";
import {
  insertMovie,
  insertShowtime,
  clearShowtimes,
  clearMovies,
  getTheaterBySlug,
} from "../lib/queries-local";
import { scrapeMetrograph } from "../lib/scrapers/metrograph";
import { scrapeFilmForum } from "../lib/scrapers/filmforum";
import { scrapeQuadCinema } from "../lib/scrapers/quadcinema";
import { scrapeIFCCenter } from "../lib/scrapers/ifccenter";

interface ScrapeSummary {
  theater: string;
  moviesScraped: number;
  showtimesScraped: number;
  moviesSaved: number;
  showtimesSaved: number;
  error?: string;
}

/**
 * Get or create a movie by title, returning its ID
 * Uses a simple deduplication strategy: if a movie with the same title exists, return its ID
 */
function getOrCreateMovie(
  movieData: {
    title: string;
    director: string | null;
    year: number | null;
    runtime: number | null;
    description: string | null;
    trailer_url: string | null;
    image_url: string | null;
  },
  existingMovies: Map<string, number>
): number {
  // Normalize title for comparison (lowercase, trim)
  const normalizedTitle = movieData.title.toLowerCase().trim();

  // Check if we already have this movie
  const existingId = existingMovies.get(normalizedTitle);
  if (existingId !== undefined) {
    return existingId;
  }

  // Insert new movie
  const movieId = insertMovie(movieData);
  existingMovies.set(normalizedTitle, movieId);
  return movieId;
}

/**
 * Scrape Metrograph and save to database
 */
async function scrapeAndSaveMetrograph(
  existingMovies: Map<string, number>
): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = {
    theater: "Metrograph",
    moviesScraped: 0,
    showtimesScraped: 0,
    moviesSaved: 0,
    showtimesSaved: 0,
  };

  try {
    console.log("\n[Metrograph] Starting scrape...");

    const theater = getTheaterBySlug("metrograph");
    if (!theater) {
      throw new Error("Metrograph theater not found in database. Run seed script first.");
    }

    const result = await scrapeMetrograph({ days: 7 });
    summary.moviesScraped = result.movies.length;
    summary.showtimesScraped = result.showtimes.length;

    console.log(`[Metrograph] Scraped ${result.movies.length} movies and ${result.showtimes.length} showtimes`);

    // Create a map of vista_film_id to movie_id for linking showtimes
    const vistaToMovieId = new Map<string, number>();

    // Insert movies
    for (const movie of result.movies) {
      const movieId = getOrCreateMovie(
        {
          title: movie.title,
          director: movie.director,
          year: movie.year,
          runtime: movie.runtime,
          description: movie.description,
          trailer_url: movie.trailer_url,
          image_url: movie.image_url,
        },
        existingMovies
      );
      vistaToMovieId.set(movie.vista_film_id, movieId);
      summary.moviesSaved++;
    }

    console.log(`[Metrograph] Saved ${summary.moviesSaved} movies`);

    // Insert showtimes
    for (const showtime of result.showtimes) {
      const movieId = vistaToMovieId.get(showtime.vista_film_id);
      if (!movieId) {
        console.warn(`[Metrograph] No movie found for vista_film_id: ${showtime.vista_film_id}`);
        continue;
      }

      insertShowtime({
        movie_id: movieId,
        theater_id: theater.id,
        date: showtime.date,
        time: showtime.time,
        ticket_url: showtime.ticket_url,
      });
      summary.showtimesSaved++;
    }

    console.log(`[Metrograph] Saved ${summary.showtimesSaved} showtimes`);
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[Metrograph] Error: ${summary.error}`);
  }

  return summary;
}

/**
 * Scrape Film Forum and save to database
 */
async function scrapeAndSaveFilmForum(
  existingMovies: Map<string, number>
): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = {
    theater: "Film Forum",
    moviesScraped: 0,
    showtimesScraped: 0,
    moviesSaved: 0,
    showtimesSaved: 0,
  };

  try {
    console.log("\n[Film Forum] Starting scrape...");

    const result = await scrapeFilmForum();
    summary.moviesScraped = result.movies.length;
    summary.showtimesScraped = result.showtimes.length;

    console.log(`[Film Forum] Scraped ${result.movies.length} movies and ${result.showtimes.length} showtimes`);

    // Insert movies and track their IDs
    const titleToMovieId = new Map<string, number>();

    for (const movie of result.movies) {
      const movieId = getOrCreateMovie(
        {
          title: movie.title,
          director: movie.director,
          year: movie.year,
          runtime: movie.runtime,
          description: movie.description,
          trailer_url: movie.trailer_url,
          image_url: movie.image_url,
        },
        existingMovies
      );
      titleToMovieId.set(movie.title, movieId);
      summary.moviesSaved++;
    }

    console.log(`[Film Forum] Saved ${summary.moviesSaved} movies`);

    // Insert showtimes using the movieShowtimeMap to link them
    for (const [title, showtimeIndices] of result.movieShowtimeMap) {
      const movieId = titleToMovieId.get(title);
      if (!movieId) {
        console.warn(`[Film Forum] No movie found for title: ${title}`);
        continue;
      }

      for (const idx of showtimeIndices) {
        const showtime = result.showtimes[idx];
        if (!showtime) continue;

        insertShowtime({
          movie_id: movieId,
          theater_id: showtime.theater_id,
          date: showtime.date,
          time: showtime.time,
          ticket_url: showtime.ticket_url,
        });
        summary.showtimesSaved++;
      }
    }

    console.log(`[Film Forum] Saved ${summary.showtimesSaved} showtimes`);
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[Film Forum] Error: ${summary.error}`);
  }

  return summary;
}

/**
 * Scrape Quad Cinema and save to database
 */
async function scrapeAndSaveQuadCinema(
  existingMovies: Map<string, number>
): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = {
    theater: "Quad Cinema",
    moviesScraped: 0,
    showtimesScraped: 0,
    moviesSaved: 0,
    showtimesSaved: 0,
  };

  try {
    console.log("\n[Quad Cinema] Starting scrape...");

    const theater = getTheaterBySlug("quad-cinema");
    if (!theater) {
      throw new Error("Quad Cinema theater not found in database. Run seed script first.");
    }

    const result = await scrapeQuadCinema();
    summary.moviesScraped = result.movies.length;
    summary.showtimesScraped = result.showtimes.length;

    console.log(`[Quad Cinema] Scraped ${result.movies.length} movies and ${result.showtimes.length} showtimes`);

    // Create a map of slug to movie_id for linking showtimes
    const slugToMovieId = new Map<string, number>();

    // Insert movies
    for (const movie of result.movies) {
      const movieId = getOrCreateMovie(
        {
          title: movie.title,
          director: movie.director,
          year: movie.year,
          runtime: movie.runtime,
          description: movie.description,
          trailer_url: movie.trailer_url,
          image_url: movie.image_url,
        },
        existingMovies
      );
      slugToMovieId.set(movie.slug, movieId);
      summary.moviesSaved++;
    }

    console.log(`[Quad Cinema] Saved ${summary.moviesSaved} movies`);

    // Insert showtimes
    for (const showtime of result.showtimes) {
      const movieId = slugToMovieId.get(showtime.slug);
      if (!movieId) {
        console.warn(`[Quad Cinema] No movie found for slug: ${showtime.slug}`);
        continue;
      }

      insertShowtime({
        movie_id: movieId,
        theater_id: theater.id,
        date: showtime.date,
        time: showtime.time,
        ticket_url: showtime.ticket_url,
      });
      summary.showtimesSaved++;
    }

    console.log(`[Quad Cinema] Saved ${summary.showtimesSaved} showtimes`);
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[Quad Cinema] Error: ${summary.error}`);
  }

  return summary;
}

/**
 * Scrape IFC Center and save to database
 */
async function scrapeAndSaveIFCCenter(
  existingMovies: Map<string, number>
): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = {
    theater: "IFC Center",
    moviesScraped: 0,
    showtimesScraped: 0,
    moviesSaved: 0,
    showtimesSaved: 0,
  };

  try {
    console.log("\n[IFC Center] Starting scrape...");

    const theater = getTheaterBySlug("ifc-center");
    if (!theater) {
      throw new Error("IFC Center theater not found in database. Run seed script first.");
    }

    const result = await scrapeIFCCenter();
    summary.moviesScraped = result.movies.length;
    summary.showtimesScraped = result.showtimes.length;

    console.log(`[IFC Center] Scraped ${result.movies.length} movies and ${result.showtimes.length} showtimes`);

    // Create a map of slug to movie_id for linking showtimes
    const slugToMovieId = new Map<string, number>();

    // Insert movies
    for (const movie of result.movies) {
      const movieId = getOrCreateMovie(
        {
          title: movie.title,
          director: movie.director,
          year: movie.year,
          runtime: movie.runtime,
          description: movie.description,
          trailer_url: movie.trailer_url,
          image_url: movie.image_url,
        },
        existingMovies
      );
      slugToMovieId.set(movie.slug, movieId);
      summary.moviesSaved++;
    }

    console.log(`[IFC Center] Saved ${summary.moviesSaved} movies`);

    // Insert showtimes
    for (const showtime of result.showtimes) {
      const movieId = slugToMovieId.get(showtime.slug);
      if (!movieId) {
        console.warn(`[IFC Center] No movie found for slug: ${showtime.slug}`);
        continue;
      }

      insertShowtime({
        movie_id: movieId,
        theater_id: theater.id,
        date: showtime.date,
        time: showtime.time,
        ticket_url: showtime.ticket_url,
      });
      summary.showtimesSaved++;
    }

    console.log(`[IFC Center] Saved ${summary.showtimesSaved} showtimes`);
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[IFC Center] Error: ${summary.error}`);
  }

  return summary;
}

/**
 * Main scrape orchestrator
 */
async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("NYC Movies Scraper");
  console.log("=".repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);

  // Clear existing data
  console.log("\nClearing old data...");
  clearShowtimes();
  clearMovies();
  console.log("Cleared showtimes and movies tables");

  // Track existing movies for deduplication across scrapers
  const existingMovies = new Map<string, number>();

  // Run scrapers - each is wrapped in try/catch so one failing doesn't stop the other
  const summaries: ScrapeSummary[] = [];

  // Scrape Metrograph
  const metrographSummary = await scrapeAndSaveMetrograph(existingMovies);
  summaries.push(metrographSummary);

  // Scrape Film Forum
  const filmForumSummary = await scrapeAndSaveFilmForum(existingMovies);
  summaries.push(filmForumSummary);

  // Scrape Quad Cinema
  const quadCinemaSummary = await scrapeAndSaveQuadCinema(existingMovies);
  summaries.push(quadCinemaSummary);

  // Scrape IFC Center
  const ifcCenterSummary = await scrapeAndSaveIFCCenter(existingMovies);
  summaries.push(ifcCenterSummary);

  // Print final summary
  console.log("\n" + "=".repeat(60));
  console.log("SCRAPE SUMMARY");
  console.log("=".repeat(60));

  let totalMovies = 0;
  let totalShowtimes = 0;
  let hasErrors = false;

  for (const summary of summaries) {
    console.log(`\n${summary.theater}:`);
    console.log(`  Scraped: ${summary.moviesScraped} movies, ${summary.showtimesScraped} showtimes`);
    console.log(`  Saved:   ${summary.moviesSaved} movies, ${summary.showtimesSaved} showtimes`);
    if (summary.error) {
      console.log(`  ERROR:   ${summary.error}`);
      hasErrors = true;
    }
    totalMovies += summary.moviesSaved;
    totalShowtimes += summary.showtimesSaved;
  }

  console.log("\n" + "-".repeat(60));
  console.log(`TOTAL: ${totalMovies} movies, ${totalShowtimes} showtimes saved`);
  console.log(`Unique movies in database: ${existingMovies.size}`);
  console.log(`Completed at: ${new Date().toISOString()}`);

  if (hasErrors) {
    console.log("\nWARNING: Some scrapers encountered errors. Check logs above.");
    process.exit(1);
  }

  // Verify data was saved
  const movieCount = localDb.prepare("SELECT COUNT(*) as count FROM Movie").get() as { count: number };
  const showtimeCount = localDb.prepare("SELECT COUNT(*) as count FROM Showtime").get() as { count: number };

  console.log("\nDatabase verification:");
  console.log(`  Movies in DB:    ${movieCount.count}`);
  console.log(`  Showtimes in DB: ${showtimeCount.count}`);

  console.log("\n" + "=".repeat(60));
  console.log("Scrape completed successfully!");
  console.log("=".repeat(60));
}

// Run the scraper
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
