import { MetrographScraper } from '../server/scrapers/metrograph.js';

export async function testMetrograph({ returnMovies = false } = {}) {
  console.log('Testing Metrograph scraper...');
  const scraper = new MetrographScraper();
  const movies = await scraper.scrape();

  // Group movies by date
  const moviesByDate = {};
  movies.forEach(movie => {
    if (!moviesByDate[movie.date]) {
      moviesByDate[movie.date] = [];
    }
    moviesByDate[movie.date].push(`${movie.time} - ${movie.title}`);
  });

  // Get today's date and next two days
  const today = new Date();
  today.setFullYear(2025);
  const dates = Array(3).fill().map((_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Show movies for each day
  dates.forEach(date => {
    const dayName = ['Thursday', 'Friday', 'Saturday'][dates.indexOf(date)];
    console.log(`\n${dayName}, ${date} Showtimes:`);
    console.log('----------------------------------------');
    if (moviesByDate[date]) {
      moviesByDate[date].sort().forEach(movie => console.log(movie));
    }
    console.log('----------------------------------------');
  });

  // Return movies if requested
  if (returnMovies) {
    return movies;
  }
}

// Allow running directly
if (process.argv[1].includes('test-metrograph.js')) {
  testMetrograph();
} 