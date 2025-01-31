import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const MovieService = {
  async getMovies({ start, end }) {
    try {
      console.log('MovieService: Getting movies with range:', {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      });

      const moviesRef = collection(db, 'movies');
      const q = query(
        moviesRef,
        where('date', '>=', start.toISOString().split('T')[0]),
        where('date', '<=', end.toISOString().split('T')[0])
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
  },

  async getMovieById(id) {
    try {
      const movieRef = doc(db, 'movies', id);
      const movieDoc = await getDoc(movieRef);
      
      if (!movieDoc.exists()) {
        return null;
      }
      
      // Get all showtimes for this movie
      const showtimesQuery = query(
        collection(db, 'movies'),
        where('title', '==', movieDoc.data().title),
        where('theater', '==', movieDoc.data().theater)
      );
      
      const showtimesSnapshot = await getDocs(showtimesQuery);
      const showtimes = showtimesSnapshot.docs.map(doc => doc.data().time);
      
      return {
        id: movieDoc.id,
        ...movieDoc.data(),
        showtimes: showtimes.sort()
      };
    } catch (error) {
      console.error('Error getting movie by ID:', error);
      throw error;
    }
  }
}; 