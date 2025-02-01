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
      // First try exact ID match
      let q = query(moviesRef, where('id', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // If not found, try partial match on title
        q = query(moviesRef, where('title', '==', decodeURIComponent(id.split('-')[0])));
        const titleSnapshot = await getDocs(q);
        
        if (titleSnapshot.empty) {
          return null;
        }
        
        return {
          id: titleSnapshot.docs[0].id,
          ...titleSnapshot.docs[0].data()
        };
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