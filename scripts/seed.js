// Import the test scripts
import { testFilmForum } from './test-filmforum.js';
import { testMetrograph } from './test-metrograph.js';
import { prisma } from '../server/db/index.js';

async function seed() {
  try {
    // Clear existing movies
    await prisma.movie.deleteMany();
    console.log('Cleared existing movies from database');

    // Run scrapers and get movies
    const filmForumMovies = await testFilmForum({ returnMovies: true });
    const metrographMovies = await testMetrograph({ returnMovies: true });
    
    // Combine all movies
    const allMovies = [...filmForumMovies, ...metrographMovies];

    // Save to database
    const result = await prisma.movie.createMany({
      data: allMovies
    });

    console.log(`Seeded ${result.count} movies to database`);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed(); 