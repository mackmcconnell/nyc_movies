"use client";

import { useState } from "react";
import { MovieWithShowtimes } from "@/lib/types";
import { CompareMovieCard } from "./CompareMovieCard";

interface CompareGridProps {
  movies: MovieWithShowtimes[];
}

export function CompareGrid({ movies }: CompareGridProps) {
  const [playbackMode, setPlaybackMode] = useState<"individual" | "all" | "focus">("individual");
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const getGridCols = () => {
    if (focusedId !== null) {
      return "grid-cols-1";
    }
    switch (movies.length) {
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-3";
      case 4:
        return "grid-cols-1 md:grid-cols-2";
      case 5:
        return "grid-cols-1 md:grid-cols-3";
      default:
        return "grid-cols-1";
    }
  };

  const handleModeChange = (mode: "individual" | "all" | "focus") => {
    setPlaybackMode(mode);
    if (mode !== "focus") {
      setFocusedId(null);
    }
  };

  const buttonBaseStyles = "px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors";
  const activeStyles = "bg-primary text-black";
  const inactiveStyles = "bg-transparent text-muted border border-border hover:text-foreground";

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          className={`${buttonBaseStyles} ${playbackMode === "individual" ? activeStyles : inactiveStyles}`}
          onClick={() => handleModeChange("individual")}
        >
          Individual
        </button>
        <button
          className={`${buttonBaseStyles} ${playbackMode === "all" ? activeStyles : inactiveStyles}`}
          onClick={() => handleModeChange("all")}
        >
          Play All
        </button>
        <button
          className={`${buttonBaseStyles} ${playbackMode === "focus" ? activeStyles : inactiveStyles}`}
          onClick={() => handleModeChange("focus")}
        >
          Focus Mode
        </button>
      </div>

      <div className={`grid gap-4 ${getGridCols()}`}>
        {movies.map((movie, index) => (
          <CompareMovieCard
            key={movie.id}
            movie={movie}
            playbackMode={playbackMode}
            isFocused={focusedId === movie.id}
            onFocus={() => setFocusedId(movie.id)}
            isOtherFocused={focusedId !== null && focusedId !== movie.id}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
