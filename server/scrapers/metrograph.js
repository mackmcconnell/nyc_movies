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
        
        // Log all days we find
        dayDivs.forEach(dayDiv => {
          const dateHeader = dayDiv.querySelector('.date');
          const dateText = dateHeader?.textContent?.trim();
          const isHidden = dayDiv.style.display === 'none';
          console.log(`Found day: ${dateText} (${isHidden ? 'hidden' : 'visible'})`);
          
          // Remove display:none to make all days visible
          dayDiv.style.display = '';
          
          if (!dateText || dateText === '  ') return;

          // Get all movies for this day
          const items = dayDiv.querySelectorAll('.item');
          items.forEach(item => {
            const titleElement = item.querySelector('a.title');
            const timeElement = item.querySelector('a[href*="txtSessionId"], a.sold_out');
            
            if (titleElement && timeElement) {
              allMovies.push({
                date: dateText,
                title: titleElement.textContent.trim(),
                showtime: timeElement.textContent.trim(),
                isSoldOut: timeElement.classList.contains('sold_out')
              });
            }
          });
        });

        return allMovies;
      });

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

      rawContent.forEach(({ date, title, showtime, isSoldOut }) => {
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