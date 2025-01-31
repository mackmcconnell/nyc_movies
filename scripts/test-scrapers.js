import { MetrographScraper } from '../src/services/scrapers/metrograph.js';
import { FilmForumScraper } from '../src/services/scrapers/filmforum.js';

async function testScrapers() {
  try {
    // Test Metrograph
    console.log('Testing Metrograph scraper...');
    const metrographScraper = new MetrographScraper();
    const metrographMovies = await metrographScraper.scrape();
    console.log('Metrograph movies:', metrographMovies);

    // Test Film Forum
    console.log('\nTesting Film Forum scraper...');
    const filmForumScraper = new FilmForumScraper();
    const filmForumMovies = await filmForumScraper.scrape();
    console.log('Film Forum movies:', filmForumMovies);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScrapers(); 