"use client";

import { useState, useMemo } from "react";
import MovieCard from "@/components/MovieCard";

// Bauhaus color scheme
const BAUHAUS_COLORS = [
  "#fdd835", // yellow
  "#e53935", // red
  "#1e88e5", // blue
  "#ff9800", // orange
  "#4caf50", // green
  "#e91e63", // pink
  "#00bcd4", // cyan
  "#9c27b0", // purple
];

interface Showtime {
  time: string;
  theater_name: string;
  theater_slug: string;
  ticket_url: string | null;
}

interface Movie {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  description: string | null;
  trailer_url: string | null;
  showtimes: Showtime[];
}

interface Theater {
  id: number;
  name: string;
  slug: string;
}

interface DateData {
  date: string;
  label: string;
  movies: Movie[];
}

interface HomeClientProps {
  dates: DateData[];
  theaters: Theater[];
}

// Get a consistent but varied color for each date index
function getColorForIndex(index: number): string {
  return BAUHAUS_COLORS[index % BAUHAUS_COLORS.length];
}

export default function HomeClient({ dates, theaters }: HomeClientProps) {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTheater, setSelectedTheater] = useState<string>("all");

  const selectedColor = getColorForIndex(selectedDateIndex);
  const movies = dates[selectedDateIndex]?.movies || [];

  // Filter movies by theater
  const filteredMovies = useMemo(() => {
    if (selectedTheater === "all") {
      return movies;
    }
    return movies
      .map((movie) => ({
        ...movie,
        showtimes: movie.showtimes.filter(
          (st) => st.theater_slug === selectedTheater
        ),
      }))
      .filter((movie) => movie.showtimes.length > 0);
  }, [movies, selectedTheater]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Date Selector - horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2 sm:mx-0 sm:px-0 sm:pb-0">
          <div className="flex gap-1.5 sm:gap-2 min-w-max">
            {dates.map((dateData, index) => {
              const isSelected = index === selectedDateIndex;
              const color = getColorForIndex(index);
              return (
                <button
                  key={dateData.date}
                  onClick={() => setSelectedDateIndex(index)}
                  style={isSelected ? { backgroundColor: color } : undefined}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                    isSelected
                      ? "text-black"
                      : "bg-transparent text-muted border border-border hover:text-foreground"
                  }`}
                >
                  {dateData.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theater Filter */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <select
            value={selectedTheater}
            onChange={(e) => setSelectedTheater(e.target.value)}
            className="bg-background border border-border text-foreground text-xs font-bold uppercase tracking-widest px-3 py-2 focus:outline-none focus:border-primary w-full sm:w-auto"
            style={{ borderColor: selectedTheater !== "all" ? selectedColor : undefined }}
          >
            <option value="all">All Theaters</option>
            {theaters.map((theater) => (
              <option key={theater.id} value={theater.slug}>
                {theater.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Movie List */}
      {filteredMovies.length === 0 && (
        <div className="text-muted text-center py-12 uppercase tracking-widest text-sm">
          No screenings
        </div>
      )}

      {filteredMovies.length > 0 && (
        <div className="border-t-2 border-border">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              director={movie.director}
              year={movie.year}
              runtime={movie.runtime}
              showtimes={movie.showtimes}
              isToday={selectedDateIndex === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
