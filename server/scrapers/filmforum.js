import puppeteer from 'puppeteer';

export class FilmForumScraper {
  async getMovieDetails(page, url) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const details = await page.evaluate(() => {
        // Get the ticket link (current URL)
        const ticketLink = window.location.href;
        
        // Get the trailer URL from the YouTube iframe
        const trailerIframe = document.querySelector('iframe[src*="youtube"]');
        const trailerUrl = trailerIframe?.src || null;

        // Get director from text that starts with "DIRECTED BY"
        const directorText = Array.from(document.querySelectorAll('p'))
          .find(p => p.textContent.includes('DIRECTED BY'))
          ?.textContent.trim();
        let director = null;
        if (directorText) {
          // Remove "WRITTEN AND" if present
          let cleanText = directorText.replace('WRITTEN AND', '').trim();
          // Replace "DIRECTED BY" with "Directed by"
          director = cleanText.replace('DIRECTED BY', 'Directed by').trim();
        }

        // Get year from text that includes a 4-digit number
        const yearMatch = document.body.textContent.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : null;

        // Get runtime from text that includes "MIN."
        const runtimeMatch = document.body.textContent.match(/(\d+)\s*MIN\./i);
        const runtime = runtimeMatch ? `${runtimeMatch[1]} min` : null;

        // Get description (first paragraph after director info)
        const description = document.querySelector('.copy p')?.textContent.trim() || null;

        return { director, year, runtime, description, ticketLink, trailerUrl };
      });

      return details;
    } catch (error) {
      console.error('Error getting movie details:', error);
      return {};
    }
  }

  async scrape() {
    let browser;
    try {
      console.log('Starting Film Forum scrape...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1920, height: 1080 }
      });
      
      const page = await browser.newPage();
      
      // Enable console log from the page
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));

      console.log('Navigating to Film Forum now playing...');
      await page.goto('https://filmforum.org/now_playing', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for initial content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // First, let's see what elements we have
      const pageStructure = await page.evaluate(() => {
        // Log the structure of the "Playing This Week" section
        const playingThisWeek = document.querySelector('.module.showtimes-table');
        console.log('Playing This Week HTML:', playingThisWeek?.outerHTML);

        // Try to find the day selector
        const allButtons = Array.from(document.querySelectorAll('button'));
        console.log('All buttons:', allButtons.map(b => ({
          text: b.textContent.trim(),
          classes: b.className
        })));

        // Try to find any element containing "SAT"
        const allElements = Array.from(document.querySelectorAll('*'));
        const satElements = allElements.filter(el => el.textContent.trim() === 'SAT');
        console.log('Elements containing SAT:', satElements.map(el => ({
          tag: el.tagName,
          classes: el.className,
          parent: el.parentElement?.tagName
        })));

        return {
          hasPlayingThisWeek: !!playingThisWeek,
          buttonCount: allButtons.length,
          satElementCount: satElements.length
        };
      });

      console.log('Page structure:', pageStructure);

      // Get all movie links and details
      const movieDetailsMap = await page.evaluate(async () => {
        const movieLinks = Array.from(document.querySelectorAll('strong > a')).map(a => a.href);
        const movieDetails = {};

        for (const link of movieLinks) {
          try {
            const response = await fetch(link);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            console.log('Fetching details for:', link);
            // Extract movie details
            const title = doc.querySelector('h2')?.textContent.trim();
            if (!title) continue;

            // Get the ticket link (the original URL)
            const ticketLink = link;
            
            // Get the trailer URL from the YouTube iframe
            const trailerIframe = doc.querySelector('iframe[src*="youtube"]');
            const trailerUrl = trailerIframe?.src || null;

            // Get director from text that starts with "DIRECTED BY"
            const directorText = Array.from(doc.querySelectorAll('p'))
              .find(p => p.textContent.includes('DIRECTED BY'))
              ?.textContent.trim();
            let director = null;
            if (directorText) {
              // Remove "WRITTEN AND" if present
              let cleanText = directorText.replace('WRITTEN AND', '').trim();
              // Replace "DIRECTED BY" with "Directed by"
              director = cleanText.replace('DIRECTED BY', 'Directed by').trim();
            }

            // Get year from text that includes a 4-digit number
            const yearMatch = doc.body.textContent.match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? yearMatch[0] : null;

            // Get runtime from text that includes "MIN."
            const runtimeMatch = doc.body.textContent.match(/(\d+)\s*MIN\./i);
            const runtime = runtimeMatch ? `${runtimeMatch[1]} min` : null;

            // Get description
            const description = doc.querySelector('.copy p')?.textContent.trim() || null;
            console.log('Found description:', description ? 'Yes' : 'No');

            movieDetails[title] = {
              director,
              year,
              runtime,
              description,
              ticketLink,
              trailerUrl
            };
          } catch (error) {
            console.error('Error fetching movie details:', error);
          }
        }

        return movieDetails;
      });

      // Get content for all days
      const rawContent = await page.evaluate(() => {
        const allMovies = [];
        // Process tabs 0-6 (THU through WED)
        for (let i = 0; i < 7; i++) {
          const dayDiv = document.querySelector(`#tabs-${i}`);
          if (!dayDiv) continue;

          const movieList = [];
          const paragraphs = dayDiv.querySelectorAll('p');
          
          paragraphs.forEach(async p => {
            let title = '';
            let times = [];
            let movieDetails = {};

            // Get the title
            const strongLink = p.querySelector('strong > a');
            if (strongLink) {
              // Handle multi-line titles
              const titleText = strongLink.textContent.trim();
              const prefix = p.querySelector('a[href*="film-forum-jr"]') ? 'FILM FORUM JR: ' : '';
              const additionalText = Array.from(p.querySelectorAll('strong'))
                .map(strong => strong.textContent.trim())
                .join(' ');
              
              title = prefix + (additionalText || titleText);
              
              // Get the movie URL for details
              const movieUrl = strongLink.href;
              if (movieUrl) {
                // Get director from text that starts with "DIRECTED BY"
                const directorText = Array.from(document.querySelectorAll('p'))
                  .find(p => p.textContent.includes('DIRECTED BY'))
                  ?.textContent.trim();
                movieDetails.director = directorText?.replace('DIRECTED BY', '').trim();

                // Get year from text that includes a 4-digit number
                const yearMatch = document.body.textContent.match(/\b(19|20)\d{2}\b/);
                movieDetails.year = yearMatch ? yearMatch[0] : null;

                // Get runtime from text that includes "MIN."
                const runtimeMatch = document.body.textContent.match(/(\d+)\s*MIN\./i);
                movieDetails.runtime = runtimeMatch ? `${runtimeMatch[1]} min` : null;

                // Get description (first paragraph after director info)
                const description = document.querySelector('.copy p')?.textContent.trim() || null;
                movieDetails.description = description;
              }
            }

            // Get showtimes
            times = Array.from(p.querySelectorAll('span'))
              .map(span => span.textContent.trim())
              .filter(time => time.match(/^\d{1,2}:\d{2}$/));

            if (title && times.length > 0) {
              movieList.push({
                title: title.replace(/\s+/g, ' ').trim(),
                showtimes: times,
                ...movieDetails
              });
            }
          });

          allMovies.push(movieList);
        }

        return allMovies;
      });

      if (!rawContent) {
        console.log('No movie data found');
        return [];
      }

      // Process the movies
      const movies = new Set();
      
      // Calculate dates for each day
      const today = new Date();
      const dates = Array(7).fill().map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        date.setFullYear(2025);
        return date.toISOString().split('T')[0];
      });

      // Process each day's movies
      rawContent.forEach((dayMovies, dayIndex) => {
        const showDate = dates[dayIndex];
        
        dayMovies.forEach(({ title, showtimes }) => {
          showtimes.forEach(time => {
            const [hours, minutes] = time.split(':').map(Number);
            
            // Skip invalid times
            if (isNaN(hours) || isNaN(minutes) || minutes >= 60) return;

            // Convert to proper time with AM/PM
            let hour = hours;
            let period = 'AM';

            if (hour < 11) {
              hour += 12;
              period = 'PM';
            } else if (hour >= 11 && hour < 12) {
              period = 'AM';
            } else if (hour === 12) {
              period = 'PM';
            }

            const formattedHour = hour > 12 ? hour - 12 : hour;
            const formattedTime = `${formattedHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

            const movieEntry = {
              title,
              theater: 'Film Forum',
              date: showDate,
              time: formattedTime,
              director: movieDetailsMap[title]?.director || null,
              year: movieDetailsMap[title]?.year || null,
              runtime: movieDetailsMap[title]?.runtime || null,
              description: movieDetailsMap[title]?.description || null,
              ticketLink: movieDetailsMap[title]?.ticketLink || null,
              trailerUrl: movieDetailsMap[title]?.trailerUrl || '/no_trailer_available.jpg',
              lastUpdated: new Date().toISOString()
            };

            movies.add(JSON.stringify(movieEntry));
          });
        });
      });

      const processedMovies = Array.from(movies)
        .map(entry => JSON.parse(entry))
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      // Debug output for just 3 days
      console.log('\nNext 3 days:');
      console.log('----------------------------------------');
      
      const threeDays = processedMovies
        .filter(movie => {
          const movieDate = new Date(movie.date);
          const today = new Date();
          today.setFullYear(2025);
          const diffDays = Math.floor((movieDate - today) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 2;
        })
        .reduce((acc, movie) => {
          if (!acc[movie.date]) {
            acc[movie.date] = [];
          }
          acc[movie.date].push(`${movie.time} - ${movie.title}`);
          return acc;
        }, {});

      Object.entries(threeDays).forEach(([date, movies]) => {
        console.log(`\n${date}:`);
        movies.forEach(movie => console.log(movie));
      });
      console.log('----------------------------------------');

      return processedMovies;
    } catch (error) {
      console.error('Error scraping Film Forum:', error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
} 