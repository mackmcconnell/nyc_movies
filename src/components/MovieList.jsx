import MovieCard from './MovieCard';

function MovieList({ movies }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {movies.map(movie => (
        <MovieCard key={`${movie.title}-${movie.time}`} movie={movie} />
      ))}
    </div>
  );
}

export default MovieList; 