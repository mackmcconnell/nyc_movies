import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { MovieService } from '@server/services/movieService.js';
import { db } from './config/firebase.js';
import { collection, getDocs, query } from 'firebase/firestore';
import TheaterFilter from './components/TheaterFilter';
import MovieCard from './components/MovieCard';
import Header from './components/Header';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MovieDetails from './components/MovieDetails';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTheater, setSelectedTheater] = useState('all');
  const [debugLog, setDebugLog] = useState([]);

  // Force error if Firebase isn't configured
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase Project ID not found in environment variables');
  }

  // Force error if Firestore isn't initialized
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  // Add debug log function
  const addDebugLog = (message) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  // Calculate min and max dates
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + 20);

  useEffect(() => {
    fetchMovies();
  }, []);

  async function fetchMovies() {
    try {
      const moviesRef = collection(db, 'movies');
      if (!moviesRef) {
        throw new Error('Could not create Firestore reference');
      }

      // Just get movies from Firebase
      const querySnapshot = await getDocs(query(moviesRef));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (!data) {
        throw new Error('No data returned from MovieService');
      }

      setMovies(data);
    } catch (err) {
      setError(err.message);
      console.error('CRITICAL ERROR:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter movies based on selected date and theater
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const filteredMovies = movies.filter(movie => {
    const isDateMatch = movie.date === selectedDateStr;
    const isTheaterMatch = selectedTheater === 'all' || movie.theater === selectedTheater;
    return isDateMatch && isTheaterMatch;
  });

  // Group movies by title and theater
  const groupedMovies = filteredMovies.reduce((acc, movie) => {
    const key = `${movie.title}-${movie.theater}`;
    if (!acc[key]) {
      acc[key] = {
        ...movie,
        showtimes: [movie.time]
      };
    } else {
      acc[key].showtimes.push(movie.time);
    }
    return acc;
  }, {});

  // Convert back to array and sort showtimes
  const moviesWithShowtimes = Object.values(groupedMovies).map(movie => ({
    ...movie,
    showtimes: movie.showtimes.sort((a, b) => {
      // Convert times to 24-hour format for comparison
      const getTimeValue = (timeStr) => {
        try {
          const match = timeStr.toLowerCase().match(/(\d+):(\d+)\s*(am|pm)/);
          if (!match) return 0; // Return 0 for invalid formats
          
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3];
          
          let hour24 = hours;
          
          if (period === 'pm' && hours !== 12) {
            hour24 = hours + 12;
          } else if (period === 'am' && hours === 12) {
            hour24 = 0;
          }
          
          return hour24 * 60 + minutes;
        } catch (error) {
          console.error('Error parsing time:', timeStr);
          return 0; // Return 0 for any parsing errors
        }
      };
      
      return getTimeValue(a) - getTimeValue(b);
    })
  }));

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen container mx-auto px-4 py-8">
        <Header />
        
        {movies.length > 0 && (
          <div className="text-xs text-[#FCEC73] opacity-50 text-center mb-4">
            Last Updated: {new Date(movies[0]?.lastUpdated).toLocaleString()}
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <>
              <div className="flex flex-wrap gap-4 mb-6 items-center justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <span className="text-theme">Date:</span>
                  <DatePicker
                    selected={selectedDate}
                    onChange={date => setSelectedDate(date)}
                    className="border p-2 rounded bg-[#2a1f1f] text-theme border-[#FCEC73] text-center md:text-left"
                    dateFormat="MMMM d, yyyy"
                    minDate={minDate}
                    maxDate={maxDate}
                    placeholderText="Select a date"
                  />
                </div>
                <div className="w-full md:w-auto flex justify-center md:justify-start mt-4 md:mt-0">
                  <TheaterFilter 
                    selectedTheater={selectedTheater}
                    onChange={setSelectedTheater}
                  />
                </div>
              </div>

              {/* Increased gap after pills */}
              <div className="mb-20"></div>

              {error && (
                <div className="p-4 border border-[#FCEC73] rounded mb-4">
                  <p className="text-theme">Error: {error}</p>
                </div>
              )}

              {moviesWithShowtimes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moviesWithShowtimes.map((movie, index) => (
                    <MovieCard 
                      key={`${movie.title}-${movie.theater}-${index}`} 
                      movie={movie}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-theme py-10">
                  No movies scheduled for this date at {selectedTheater === 'all' ? 'any theater' : selectedTheater}
                </div>
              )}
            </>
          } />
          <Route path="/movie/:movieId" element={<MovieDetails />} />
        </Routes>

        <footer className="mt-12 text-center pb-4">
          <p className="font-['Source_Code_Pro'] text-[#FCEC73] text-sm"
             style={{ textShadow: '0 0 18px rgba(252, 236, 115, 0.5)' }}>
            Made by <a 
              href="mailto:bff@omg.lol" 
              className="underline decoration-[#FCEC73] hover:opacity-80 transition-opacity"
            >
              Maqq
            </a>
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App; 