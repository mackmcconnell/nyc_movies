import { db } from '../../src/config/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class MovieService {
  static async getMovies({ start, end }) {
    try {
      const moviesRef = collection(db, 'movies');
      const q = query(moviesRef);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting movies:', error);
      throw error;
    }
  }

  static async getMovieById(id) {
    try {
      const moviesRef = collection(db, 'movies');
      const q = query(moviesRef, where('id', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };
    } catch (error) {
      console.error('Error getting movie by id:', error);
      throw error;
    }
  }
} 