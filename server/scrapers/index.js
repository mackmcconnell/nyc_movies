// Base scraper class
class TheaterScraper {
  async fetch() {
    throw new Error('Method not implemented');
  }
  
  normalize(data) {
    throw new Error('Method not implemented');
  }
}

// Individual theater scrapers
class MetrographScraper extends TheaterScraper {
  async fetch() {
    const response = await fetch('https://metrograph.com/calendar/');
    const html = await response.text();
    // Parse HTML and extract showtimes
    // You might want to use cheerio or another HTML parser here
    return html;
  }

  normalize(data) {
    // Convert theater-specific format to our standard format
    return {
      title: '',
      theater: 'Metrograph',
      date: '',
      time: '',
      duration: '',
      director: ''
    };
  }
} 