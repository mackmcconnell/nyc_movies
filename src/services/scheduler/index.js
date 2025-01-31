import { MovieService } from '../db';
import { MetrographScraper } from '../scrapers';

export class UpdateScheduler {
  constructor() {
    this.scrapers = [
      new MetrographScraper(),
      // Add more scrapers as needed
    ];
  }

  async updateMovies() {
    const movies = [];
    
    for (const scraper of this.scrapers) {
      const rawData = await scraper.fetch();
      const normalizedData = scraper.normalize(rawData);
      movies.push(...normalizedData);
    }

    await MovieService.updateMovies(movies);
  }
} 