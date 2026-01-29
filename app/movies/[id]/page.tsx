import { notFound } from "next/navigation";
import { getMovieById } from "@/lib/queries";
import { getYouTubeId } from "@/lib/youtube";

interface ShowtimesByDate {
  [date: string]: {
    time: string;
    theater_name: string;
    ticket_url: string | null;
  }[];
}

// Format time from 24h to 12h
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "p" : "a";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")}${period}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  return `${dayName}, ${monthName} ${dayNum}`;
}

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    notFound();
  }

  const movie = await getMovieById(movieId);

  if (!movie) {
    notFound();
  }

  // Group showtimes by date
  const showtimesByDate: ShowtimesByDate = {};

  for (const showtime of movie.showtimes) {
    if (!showtimesByDate[showtime.date]) {
      showtimesByDate[showtime.date] = [];
    }
    showtimesByDate[showtime.date].push({
      time: showtime.time,
      theater_name: showtime.theater.name,
      ticket_url: showtime.ticket_url,
    });
  }

  // Sort showtimes within each date by time, then by theater name
  for (const date of Object.keys(showtimesByDate)) {
    showtimesByDate[date].sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.theater_name.localeCompare(b.theater_name);
    });
  }

  // Sort dates
  const sortedDates = Object.keys(showtimesByDate).sort();

  // Build metadata string
  const meta = [
    movie.director,
    movie.year,
    movie.runtime ? `${movie.runtime} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Movie Title */}
      <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground mb-2">
        {movie.title}
      </h1>

      {/* Metadata */}
      {meta && (
        <div className="text-sm text-muted uppercase tracking-wider mb-6">
          {meta}
        </div>
      )}

      {/* Description */}
      {movie.description && (
        <p className="text-foreground leading-relaxed mb-6 max-w-2xl">
          {movie.description}
        </p>
      )}

      {/* Trailer or Image */}
      {(() => {
        const youtubeId = movie.trailer_url ? getYouTubeId(movie.trailer_url) : null;
        if (youtubeId) {
          return (
            <div className="mb-8">
              <div className="aspect-video max-w-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-2 border-border"
                />
              </div>
            </div>
          );
        }
        if (movie.trailer_url) {
          return (
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-primary text-black text-xs font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors mb-8"
            >
              Watch Trailer
            </a>
          );
        }
        if (movie.image_url) {
          return (
            <div className="mb-8">
              <img
                src={movie.image_url}
                alt={movie.title}
                className="max-w-2xl w-full border-2 border-border"
              />
            </div>
          );
        }
        return null;
      })()}

      {/* Showtimes */}
      {sortedDates.length > 0 ? (
        <div className="border-t-2 border-border pt-6">
          <h2 className="text-lg font-black uppercase tracking-widest text-foreground mb-4">
            Showtimes
          </h2>

          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date Header */}
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-3">
                  {formatDate(date)}
                </h3>

                {/* Showtimes for this date */}
                <div className="flex flex-wrap gap-2">
                  {showtimesByDate[date].map((showtime, index) => (
                    <a
                      key={`${date}-${showtime.time}-${showtime.theater_name}-${index}`}
                      href={showtime.ticket_url || "#"}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-black text-xs font-bold uppercase tracking-wide hover:bg-yellow-300 transition-colors"
                    >
                      <span>{formatTime(showtime.time)}</span>
                      <span className="text-black/60">@</span>
                      <span>{showtime.theater_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-muted text-center py-12 uppercase tracking-widest text-sm">
          No upcoming showtimes
        </div>
      )}
    </div>
  );
}
