import { db } from './firebase-admin.js';
import { MetrographScraper } from '../server/scrapers/metrograph.js';
import { FilmForumScraper } from '../server/scrapers/filmforum.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function getAllMovies() {
  try {
    const metrographScraper = new MetrographScraper();
    const filmForumScraper = new FilmForumScraper();

    // Run both scrapers in parallel
    const [metrographMovies, filmForumMovies] = await Promise.all([
      metrographScraper.scrape(),
      filmForumScraper.scrape()
    ]);

    // Combine and sort all movies
    const allMovies = [...metrographMovies, ...filmForumMovies];
    
    // Sort by date and time
    allMovies.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    return allMovies;
  } catch (error) {
    console.error('Error getting movies:', error);
    return [];
  }
}

async function seedMovies() {
  try {
    console.log('Starting movie database seed...');
    
    // Get movies from scrapers
    console.log('Fetching movies from theaters...');
    const movies = await getAllMovies();
    
    console.log(`Found ${movies.length} movies to seed`);

    // Batch add movies to database
    console.log('Adding movies to database...');
    const batch = db.batch();
    const moviesRef = db.collection('movies');

    // First, clear existing movies
    const existingMovies = await moviesRef.get();
    existingMovies.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new movies
    movies.forEach(movie => {
      const newMovieRef = moviesRef.doc();
      batch.set(newMovieRef, {
        ...movie,
        lastUpdated: new Date().toISOString()
      });
    });

    // Commit the batch
    await batch.commit();
    console.log(`Successfully added ${movies.length} movies to database`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding movies:', error);
    process.exit(1);
  }
}

seedMovies(); 