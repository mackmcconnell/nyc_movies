"use client";

import { useCompare } from "@/components/compare/CompareProvider";

interface Showtime {
  time: string;
  theater_name: string;
  theater_slug: string;
  ticket_url: string | null;
}

interface MovieCardProps {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  showtimes: Showtime[];
  isToday?: boolean;
}

// Group showtimes by theater
function groupByTheater(showtimes: Showtime[]): Map<string, Showtime[]> {
  const grouped = new Map<string, Showtime[]>();
  for (const st of showtimes) {
    const existing = grouped.get(st.theater_name) || [];
    existing.push(st);
    grouped.set(st.theater_name, existing);
  }
  return grouped;
}

// Format time from 24h to 12h
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "p" : "a";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")}${period}`;
}

// Check if a showtime has passed (ET timezone)
function hasTimePassed(time: string): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const [hours, minutes] = time.split(":").map(Number);
  const showtimeMinutes = hours * 60 + minutes;
  const currentMinutes = etTime.getHours() * 60 + etTime.getMinutes();
  return currentMinutes > showtimeMinutes;
}

export default function MovieCard({
  id,
  title,
  director,
  year,
  runtime,
  showtimes,
  isToday = false,
}: MovieCardProps) {
  const { isSelected, addMovie, removeMovie, canAddMore } = useCompare();
  const selected = isSelected(id);
  const groupedShowtimes = groupByTheater(showtimes);

  // Build metadata string
  const meta = [director, year, runtime ? `${runtime}m` : null]
    .filter(Boolean)
    .join(" · ");

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected) {
      removeMovie(id);
    } else if (canAddMore) {
      addMovie(id);
    }
  };

  return (
    <div className="py-4 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
        {/* Title and meta */}
        <div className="sm:w-1/3 min-w-0 flex items-start gap-2">
          {/* Compare Toggle Button */}
          <button
            onClick={handleToggle}
            disabled={!selected && !canAddMore}
            className={`w-3 h-3 flex-shrink-0 rounded-full border transition-colors mt-1 ${
              selected
                ? "bg-primary border-primary"
                : canAddMore
                  ? "border-muted hover:border-primary"
                  : "border-muted opacity-40 cursor-not-allowed"
            }`}
            title={
              selected
                ? "Remove from compare"
                : canAddMore
                  ? "Add to compare"
                  : "Compare limit reached (5)"
            }
          />
          <div>
            <a href={`/movies/${id}`} className="font-bold uppercase tracking-tight text-foreground hover:text-primary transition-colors">
              {title}
            </a>
            {meta && (
              <div className="text-xs text-muted tracking-wide">{meta}</div>
            )}
          </div>
        </div>

        {/* Showtimes by theater */}
        <div className="flex-1 flex flex-col gap-2 text-sm items-end">
          {Array.from(groupedShowtimes.entries()).map(([theater, times]) => (
            <div key={theater} className="flex flex-col gap-1 items-end">
              <span className="text-muted text-xs uppercase tracking-wider">{theater}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {times.map((st, i) => {
                  const isPast = isToday && hasTimePassed(st.time);
                  return (
                    <a
                      key={i}
                      href={st.ticket_url || "#"}
                      className={`w-14 text-center py-0.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                        isPast
                          ? "bg-border text-muted line-through pointer-events-none"
                          : "bg-primary text-black hover:bg-yellow-300"
                      }`}
                    >
                      {formatTime(st.time)}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
