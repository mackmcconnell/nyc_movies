import { FilmForumScraper } from '../server/scrapers/filmforum.js';

export async function testFilmForum() {
  console.log('Testing Film Forum scraper...');
  const scraper = new FilmForumScraper();
  const movies = await scraper.scrape();

  // Group movies by date
  const moviesByDate = {};
  movies.forEach(movie => {
    if (!moviesByDate[movie.date]) {
      moviesByDate[movie.date] = [];
    }
    moviesByDate[movie.date].push({
      ...movie,
      displayString: `${movie.time} - ${movie.title}`
    });
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
      moviesByDate[date].sort((a, b) => a.time.localeCompare(b.time)).forEach(movie => {
        console.log(movie.displayString);
        if (movie.director) console.log(`  Director: ${movie.director}`);
        if (movie.year) console.log(`  Year: ${movie.year}`);
        if (movie.runtime) console.log(`  Runtime: ${movie.runtime}`);
        if (movie.description) {
          console.log('  Description:');
          console.log(`    ${movie.description.slice(0, 150)}...`);
        }
        console.log(''); // Empty line between movies
      });
    }
    console.log('----------------------------------------');
  });
}

// Allow running directly
if (process.argv[1].includes('test-filmforum.js')) {
  testFilmForum();
} 