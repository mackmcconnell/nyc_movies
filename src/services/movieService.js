import { db } from '../config/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const MovieService = {
  async getMovies(dateRange) {
    try {
      console.log('MovieService: Getting movies with range:', {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      });

      const moviesRef = collection(db, 'movies');
      const q = query(
        moviesRef,
        where('date', '>=', dateRange.start.toISOString().split('T')[0]),
        where('date', '<=', dateRange.end.toISOString().split('T')[0])
      );

      const snapshot = await getDocs(q);
      const movies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('MovieService: Retrieved movies:', {
        count: movies.length,
        dates: [...new Set(movies.map(m => m.date))].sort(),
        sample: movies.slice(0, 2)
      });

      return movies;
    } catch (error) {
      console.error('MovieService: Error getting movies:', error);
      throw error;
    }
  }
}; 