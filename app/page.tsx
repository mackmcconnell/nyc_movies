"use client";

import { useState, useEffect, useMemo } from "react";
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

interface ApiResponse {
  date: string;
  movies: Movie[];
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date, index: number): string {
  if (index === 0) {
    return "Today";
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

function getNext7Days(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Get a consistent but varied color for each date index
function getColorForIndex(index: number): string {
  return BAUHAUS_COLORS[index % BAUHAUS_COLORS.length];
}

export default function Home() {
  const [dates] = useState<Date[]>(getNext7Days);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDate = dates[selectedDateIndex];
  const selectedColor = getColorForIndex(selectedDateIndex);

  // Fetch theaters on mount
  useEffect(() => {
    fetch("/api/theaters")
      .then((res) => res.json())
      .then((data) => setTheaters(data.theaters))
      .catch(() => {});
  }, []);

  // Fetch movies when date changes
  useEffect(() => {
    async function fetchMovies() {
      setIsLoading(true);
      setError(null);

      try {
        const dateStr = formatDateForApi(selectedDate);
        const response = await fetch(`/api/movies?date=${dateStr}`);

        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }

        const data: ApiResponse = await response.json();
        setMovies(data.movies);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMovies();
  }, [selectedDate]);

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
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Date Selector */}
        <div className="flex flex-wrap gap-2">
          {dates.map((date, index) => {
            const isSelected = index === selectedDateIndex;
            const color = getColorForIndex(index);
            return (
              <button
                key={formatDateForApi(date)}
                onClick={() => setSelectedDateIndex(index)}
                style={isSelected ? { backgroundColor: color } : undefined}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  isSelected
                    ? "text-black"
                    : "bg-transparent text-muted border border-border hover:text-foreground"
                }`}
              >
                {formatDateLabel(date, index)}
              </button>
            );
          })}
        </div>

        {/* Theater Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={selectedTheater}
            onChange={(e) => setSelectedTheater(e.target.value)}
            className="bg-background border border-border text-foreground text-xs font-bold uppercase tracking-widest px-3 py-2 focus:outline-none focus:border-primary"
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

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center">
          <div
            className="inline-block w-4 h-4 animate-pulse"
            style={{ backgroundColor: selectedColor }}
          ></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-secondary text-center py-12 uppercase tracking-widest text-sm">
          {error}
        </div>
      )}

      {/* Movie List */}
      {!isLoading && !error && filteredMovies.length === 0 && (
        <div className="text-muted text-center py-12 uppercase tracking-widest text-sm">
          No screenings
        </div>
      )}

      {!isLoading && !error && filteredMovies.length > 0 && (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
