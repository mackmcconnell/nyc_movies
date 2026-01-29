"use client";

import { useCompare } from "./CompareProvider";
import TrailerPlayer from "./TrailerPlayer";
import { MovieWithShowtimes } from "@/lib/types";
import Link from "next/link";

interface CompareMovieCardProps {
  movie: MovieWithShowtimes;
  playbackMode: "individual" | "all" | "focus";
  isFocused: boolean;
  onFocus: () => void;
  isOtherFocused: boolean;
  index: number;
}

export function CompareMovieCard({
  movie,
  playbackMode,
  isFocused,
  onFocus,
  isOtherFocused,
  index,
}: CompareMovieCardProps) {
  const { removeMovie } = useCompare();

  const containerClasses = [
    "border-2 border-border transition-all",
    isFocused && "col-span-full",
    isOtherFocused && "opacity-60 scale-95",
  ]
    .filter(Boolean)
    .join(" ");

  const truncatedDescription =
    movie.description && movie.description.length > 150
      ? movie.description.slice(0, 150) + "..."
      : movie.description;

  return (
    <div className={containerClasses} onClick={onFocus}>
      {/* Header section */}
      <div className="p-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-black uppercase tracking-tight">
              {movie.title}
            </h3>
            <p className="text-xs text-muted">
              {[movie.director, movie.year, movie.runtime ? `${movie.runtime}m` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeMovie(movie.id);
            }}
            className="w-6 h-6 text-muted hover:text-secondary flex items-center justify-center"
            aria-label={`Remove ${movie.title} from comparison`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Trailer player */}
      <TrailerPlayer
        trailerUrl={movie.trailer_url}
        title={movie.title}
        autoplay={playbackMode === "all"}
        muted={playbackMode === "all" && index > 0}
        expanded={isFocused}
      />

      {/* Description section */}
      {movie.description && !isOtherFocused && (
        <div className="p-3">
          <p className="text-sm">{truncatedDescription}</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          href={`/movies/${movie.id}`}
          className="text-xs font-bold uppercase tracking-widest text-primary hover:text-yellow-300"
          onClick={(e) => e.stopPropagation()}
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
}
