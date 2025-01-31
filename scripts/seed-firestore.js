import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { sampleMovieData } from '../src/data/sampleData.js';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedFirestore() {
  console.log('Starting to seed Firestore...');
  const moviesRef = collection(db, 'movies');
  let count = 0;

  try {
    for (const movie of sampleMovieData) {
      await addDoc(moviesRef, {
        ...movie,
        // Convert date string to Firestore timestamp
        date: new Date(movie.date).toISOString().split('T')[0]
      });
      count++;
      console.log(`Added movie: ${movie.title} on ${movie.date}`);
    }

    console.log(`Successfully added ${count} movies to Firestore!`);
  } catch (error) {
    console.error('Error seeding Firestore:', error);
  }
}

// Run the seed function
seedFirestore().then(() => {
  console.log('Seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 