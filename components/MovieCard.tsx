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

export default function MovieCard({
  id,
  title,
  director,
  year,
  runtime,
  showtimes,
}: MovieCardProps) {
  const groupedShowtimes = groupByTheater(showtimes);

  // Build metadata string
  const meta = [director, year, runtime ? `${runtime}m` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="py-4 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
        {/* Title and meta */}
        <div className="sm:w-1/3 min-w-0">
          <a href={`/movies/${id}`} className="font-bold uppercase tracking-tight text-foreground hover:text-primary transition-colors">
            {title}
          </a>
          {meta && (
            <div className="text-xs text-neutral-500 tracking-wide">{meta}</div>
          )}
        </div>

        {/* Showtimes by theater */}
        <div className="flex-1 flex flex-col gap-1 text-sm">
          {Array.from(groupedShowtimes.entries()).map(([theater, times]) => (
            <div key={theater} className="flex items-center justify-between gap-4">
              <span className="text-neutral-500 text-xs uppercase tracking-wider">{theater}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {times.map((st, i) => (
                  <a
                    key={i}
                    href={st.ticket_url || "#"}
                    className="w-14 text-center py-0.5 bg-primary text-black text-xs font-bold uppercase tracking-wide hover:bg-yellow-300 transition-colors"
                  >
                    {formatTime(st.time)}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
