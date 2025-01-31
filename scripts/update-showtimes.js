import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { MetrographScraper } from '../src/services/scrapers/metrograph.js';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateShowtimes() {
  try {
    const metrographScraper = new MetrographScraper();
    const movies = await metrographScraper.scrape();

    // Delete old Metrograph showings
    const oldShowings = query(
      collection(db, 'movies'),
      where('theater', '==', 'Metrograph')
    );
    const snapshot = await getDocs(oldShowings);
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Add new showings
    for (const movie of movies) {
      await addDoc(collection(db, 'movies'), movie);
    }

    console.log(`Updated ${movies.length} Metrograph showings`);
  } catch (error) {
    console.error('Error updating showtimes:', error);
  }
}

updateShowtimes(); 