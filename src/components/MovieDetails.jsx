import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MovieService } from '../../server/services/movieService.js';
import LoadingScreen from './LoadingScreen';

// Words that should not be capitalized in titles
const minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 
                   'of', 'on', 'or', 'the', 'to', 'with', 'nor', 'yet'];

function toTitleCase(str) {
  // Handle null or undefined
  if (!str) return str;
  
  return str.toLowerCase().split(' ').map((word, index, arr) => {
    // Always capitalize first and last word
    if (index === 0 || index === arr.length - 1) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    // Don't capitalize minor words
    if (minorWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    // Capitalize other words
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function MovieDetails() {
  const { movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMovie() {
      try {
        const movieData = await MovieService.getMovieById(movieId);
        setMovie(movieData);
      } catch (error) {
        console.error('Error fetching movie:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [movieId]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto px-4">
      <button 
        onClick={() => navigate(-1)}
        className="text-[#FCEC73] mb-8 font-['Source_Code_Pro']"
      >
        ← Back
      </button>

      {movie ? (
        <div className="relative">
          {/* Title and Buy Button Row */}
          <div className="flex justify-between items-start mb-8">
            <h1 className="text-[#FCEC73] text-4xl font-['Source_Code_Pro'] font-extrabold">
              <span className="blur-[0.5px]">{toTitleCase(movie.title)}</span>
            </h1>
            <button 
              className="border-2 border-[#FCEC73] text-[#FCEC73] px-6 py-2 font-['Source_Code_Pro']"
              onClick={() => window.open(movie.ticketLink, '_blank')}
            >
              BUY TIX
            </button>
          </div>

          {/* Video Embed */}
          <div className="w-full md:w-[60%] aspect-video mb-8">
            {movie.trailerUrl && movie.trailerUrl.includes('youtube') ? (
              <iframe
                className="w-full h-full"
                src={movie.trailerUrl}
                title={`${movie.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src="/no_trailer_available.jpg"
                  alt="No Trailer Available"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Movie Info */}
          <div className="text-[#FCEC73] font-['Source_Code_Pro'] space-y-4">
            <p>{movie.director || "Director Unknown"}</p>
            <p>{movie.year || "YEAR OF RELEASE"} / {movie.runtime || "RUNTIME"}</p>
            <p className="max-w-3xl">
              {movie.description || "DESCRIPTION"}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center text-theme py-10">
          Movie not found
        </div>
      )}
    </div>
  );
}

export default MovieDetails; 