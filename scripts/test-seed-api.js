import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSeedApi() {
  try {
    console.log('Testing seed API with key:', process.env.SEED_API_KEY);
    const response = await fetch('http://localhost:3000/api/seed', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SEED_API_KEY
      }
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSeedApi(); 