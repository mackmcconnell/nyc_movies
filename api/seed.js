import { FilmForumScraper } from '../server/scrapers/filmforum.js';
import { MetrographScraper } from '../server/scrapers/metrograph.js';
import { db } from '../src/config/firebase.js';
import { collection, addDoc, query, getDocs, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  // Add authentication check
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.SEED_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear existing movies
    const moviesRef = collection(db, 'movies');
    const snapshot = await getDocs(query(moviesRef));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Scrape new movies
    const filmForumScraper = new FilmForumScraper();
    const metrographScraper = new MetrographScraper();

    const [filmForumMovies, metrographMovies] = await Promise.all([
      filmForumScraper.scrape(),
      metrographScraper.scrape()
    ]);

    // Add new movies
    const addPromises = [...filmForumMovies, ...metrographMovies]
      .map(movie => addDoc(moviesRef, movie));
    await Promise.all(addPromises);

    res.status(200).json({ message: 'Seeding completed successfully' });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: error.message });
  }
} 