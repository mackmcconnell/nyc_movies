import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../service-account.json');

const app = initializeApp({
  credential: cert(serviceAccountPath),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
});

export const db = getFirestore(app); 