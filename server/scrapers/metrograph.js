import puppeteer from 'puppeteer';

export class MetrographScraper {
  async scrape() {
    let browser;
    try {
      console.log('Starting Metrograph scrape...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1920, height: 1080 }
      });
      
      const page = await browser.newPage();
      
      // Enable console log from the page
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));

      // Increase timeouts
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      console.log('Navigating to Metrograph calendar...');
      await page.goto('https://metrograph.com/calendar/', {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Log the page structure
      await page.evaluate(() => {
        console.log('Page HTML:', document.body.innerHTML);
        const items = document.querySelectorAll('.item');
        console.log('Found items:', items.length);
        const dateElements = document.querySelectorAll('*');
        Array.from(dateElements).forEach(el => {
          if (el.textContent.toLowerCase().includes('today') || 
              el.textContent.toLowerCase().includes('tomorrow')) {
            console.log('Date element found:', {
              tag: el.tagName,
              class: el.className,
              text: el.textContent.trim()
            });
          }
        });
      });

      // Get movies for all days
      const rawContent = await page.evaluate(() => {
        const allMovies = [];
        
        // Find all calendar day sections
        const dayDivs = document.querySelectorAll('.calendar-list-day');
        
        // Process each day
        for (const dayDiv of dayDivs) {
          const dateHeader = dayDiv.querySelector('.date');
          const dateText = dateHeader?.textContent?.trim();
          
          dayDiv.style.display = '';
          
          if (!dateText || dateText === '  ') continue;

          // Get all movies for this day
          const items = dayDiv.querySelectorAll('.item');
          for (const item of items) {
            const titleElement = item.querySelector('a.title');
            const timeElement = item.querySelector('a[href*="txtSessionId"], a.sold_out');
            
            if (titleElement && timeElement) {
              const movieUrl = titleElement.href;
              
              allMovies.push({
                date: dateText,
                title: titleElement.textContent.trim(),
                showtime: timeElement.textContent.trim(),
                isSoldOut: timeElement.classList.contains('sold_out'),
                movieUrl // Add URL to fetch details later
              });
            }
          }
        }

        return allMovies;
      });

      // Now fetch movie details for each movie
      const movieDetailsCache = new Map();
      
      for (const movie of rawContent) {
        if (!movieDetailsCache.has(movie.movieUrl)) {
          console.log(`\nFetching details for: ${movie.title}`);
          // Navigate to movie page
          await page.goto(movie.movieUrl, { waitUntil: 'networkidle0' });
          
          // Get movie details
          const details = await page.evaluate(() => {
            // Get the metadata h5 elements
            const metaElements = document.querySelectorAll('h5');
            let director = null;
            let runtime = null;
            let year = null;
            
            // Look through h5 elements for director and metadata
            metaElements.forEach(el => {
              const text = el.textContent.trim();
              
              // Find director
              if (text.includes('Director:')) {
                director = `Directed by ${text.split('Director:')[1].split('/')[0].trim()}`;
              }
              
              // Find year and runtime in the same element (format: "2024 / 108min / DCP")
              if (text.includes('min')) {
                const parts = text.split('/').map(part => part.trim());
                year = parts[0];
                const runtimeMatch = parts.find(part => part.includes('min'));
                if (runtimeMatch) {
                  runtime = `${runtimeMatch.match(/(\d+)min/)[1]} min`;
                }
              }
            });
            
            // Get description - it's the first paragraph after the metadata
            const description = Array.from(document.querySelectorAll('p'))
              .find(p => {
                // Skip any paragraphs that are part of metadata
                const isMetadata = p.closest('.film-meta');
                const hasContent = p.textContent.trim().length > 50;
                return !isMetadata && hasContent;
              })?.textContent.trim() || null;
            
            // Get trailer URL from film-trailer-holder div
            let trailerUrl = '/no_trailer_available.jpg';
            
            // Try multiple ways to find the YouTube URL
            const findYoutubeUrl = () => {
              // First check for lite-youtube element (most reliable)
              const liteYoutube = document.querySelector('lite-youtube');
              if (liteYoutube) {
                const videoId = liteYoutube.getAttribute('videoid');
                if (videoId) {
                  return `https://www.youtube.com/embed/${videoId}`;
                }
              }
              
              // Fallback: check for iframe with YouTube src
              const youtubeIframe = document.querySelector('iframe[src*="youtube"]');
              if (youtubeIframe?.src) return youtubeIframe.src;
              
              // Check for YouTube link
              const youtubeLink = document.querySelector('a[href*="youtube"]');
              if (youtubeLink?.href) return youtubeLink.href;
              
              // Check for embedded player div
              const playerDiv = document.querySelector('div[class*="youtube"]');
              if (playerDiv) {
                const dataUrl = playerDiv.getAttribute('data-url') || 
                               playerDiv.getAttribute('data-src') ||
                               playerDiv.dataset.videoUrl;
                if (dataUrl?.includes('youtube')) return dataUrl;
              }
              
              // Look for YouTube URL in any element's data attributes
              const elements = document.querySelectorAll('[data-video-url], [data-url], [data-src]');
              for (const el of elements) {
                const url = el.getAttribute('data-video-url') || 
                            el.getAttribute('data-url') || 
                            el.getAttribute('data-src');
                if (url?.includes('youtube')) return url;
              }
              
              // Last resort: search for YouTube URL pattern in the page HTML
              const youtubePattern = /https:\/\/(?:www\.)?youtube\.com\/(?:embed\/|watch\?v=)[a-zA-Z0-9_-]+/;
              const match = document.body.innerHTML.match(youtubePattern);
              return match?.[0];
            };
            
            const youtubeUrl = findYoutubeUrl();
            if (youtubeUrl) {
              trailerUrl = youtubeUrl;
              console.log('Found trailer URL:', trailerUrl);
            } else {
              console.log('No trailer URL found, using fallback image');
            }
            
            return { director, runtime, year, description, trailerUrl };
          });
          
          movieDetailsCache.set(movie.movieUrl, {
            ...details,
            ticketLink: movie.movieUrl
          });

          // Log the details we found
          console.log('----------------------------------------');
          console.log('Movie Details:');
          console.log('Director:', details.director || 'Not found');
          console.log('Year:', details.year || 'Not found');
          console.log('Runtime:', details.runtime || 'Not found');
          console.log('Description:', details.description ? 
            (details.description.length > 100 ? 
              details.description.substring(0, 100) + '...' : 
              details.description) : 
            'Not found'
          );
          console.log('Ticket Link:', movie.movieUrl);
          console.log('Trailer URL:', details.trailerUrl);
          console.log('----------------------------------------');
        }
        
        // Add details to movie object
        Object.assign(movie, movieDetailsCache.get(movie.movieUrl));
      }

      if (!rawContent || !rawContent.length) {
        console.log('No movies found on Metrograph calendar');
        return [];
      }

      // Get first and last dates
      const dates = rawContent.map(m => formatDate(m.date))
        .filter(d => d) // Remove null dates
        .sort();
      
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      console.log(`Found ${rawContent.length} movies from ${firstDate} to ${lastDate}`);

      // Process the movies
      const movies = new Set();
      
      // Convert date text like "Wednesday February 5" to "2025-02-05"
      function formatDate(dateText) {
        const months = {
          'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        
        const match = dateText.match(/(\w+) (\w+) (\d+)/);
        if (!match) return null;
        
        const [_, dayName, monthName, day] = match;
        const month = months[monthName];
        const paddedDay = day.padStart(2, '0');
        
        return `2025-${month}-${paddedDay}`;
      }

      rawContent.forEach(({ date, title, showtime, isSoldOut, director, runtime, description, trailerUrl, ticketLink }) => {
        const dateStr = formatDate(date);
        if (!dateStr) return;

        // Convert time from format like "1:40pm" to "1:40 PM"
        const timeMatch = showtime.toLowerCase().match(/(\d+):(\d+)(am|pm)/);
        if (!timeMatch) return;

        const [_, hours, minutes, period] = timeMatch;
        const formattedTime = `${hours}:${minutes} ${period.toUpperCase()}`;

        const movieEntry = {
          title,
          theater: 'Metrograph',
          date: dateStr,
          time: formattedTime,
          status: isSoldOut ? 'Sold Out' : 'Available',
          director: director || null,
          year: runtime ? runtime.split(' ')[0] : null,
          runtime: runtime || null,
          description: description || null,
          ticketLink: ticketLink || null,
          trailerUrl: trailerUrl || '/no_trailer_available.jpg',
          lastUpdated: new Date().toISOString()
        };

        movies.add(JSON.stringify(movieEntry));
      });

      const processedMovies = Array.from(movies)
        .map(entry => JSON.parse(entry))
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      return processedMovies;

    } catch (error) {
      console.error('Error scraping Metrograph:', error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
} 