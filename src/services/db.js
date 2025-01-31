import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export const MovieService = {
  // ... existing methods ...

  async batchAddMovies(movies) {
    const batch = writeBatch(db);
    const moviesRef = collection(db, 'movies');

    // First, clear existing movies
    const existingMovies = await getDocs(moviesRef);
    existingMovies.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new movies
    movies.forEach(movie => {
      const newMovieRef = doc(moviesRef); // Auto-generate ID
      batch.set(newMovieRef, {
        ...movie,
        lastUpdated: new Date().toISOString()
      });
    });

    // Commit the batch
    await batch.commit();
    console.log(`Successfully added ${movies.length} movies to database`);
  },

  async getMovies(dateRange) {
    const moviesRef = collection(db, 'movies');
    const q = query(
      moviesRef,
      where('date', '>=', dateRange.start.toISOString().split('T')[0]),
      where('date', '<=', dateRange.end.toISOString().split('T')[0])
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}; 