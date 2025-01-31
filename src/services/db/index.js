import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { app } from '../../config/firebase';

const db = getFirestore(app);

export const MovieService = {
  async getMovies(dateRange) {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Convert date objects to strings for comparison
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      const moviesRef = collection(db, 'movies');
      
      // First get all movies and filter in memory
      // This is temporary until we set up proper Firestore indexes
      const snapshot = await getDocs(moviesRef);
      
      const movies = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(movie => {
          return movie.date >= startDate && movie.date <= endDate;
        });

      console.log('Fetched movies:', movies); // Debug log
      return movies;

    } catch (error) {
      console.error("Error fetching movies:", error);
      return [];
    }
  },

  async updateMovies(movies) {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const batch = db.batch();
      // Update movies in batches
      return batch.commit();
    } catch (error) {
      console.error("Error updating movies:", error);
      return null;
    }
  }
}; 