import { NextRequest, NextResponse } from "next/server";
import { getMovieById } from "@/lib/queries";

interface ShowtimesByDate {
  [date: string]: {
    time: string;
    theater_name: string;
    ticket_url: string | null;
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    return NextResponse.json(
      { error: "Invalid movie ID" },
      { status: 400 }
    );
  }

  const movie = getMovieById(movieId);

  if (!movie) {
    return NextResponse.json(
      { error: "Movie not found" },
      { status: 404 }
    );
  }

  // Group showtimes by date, then include theater info
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

  return NextResponse.json({
    movie: {
      id: movie.id,
      title: movie.title,
      director: movie.director,
      year: movie.year,
      runtime: movie.runtime,
      description: movie.description,
      trailer_url: movie.trailer_url,
      showtimes_by_date: showtimesByDate,
    },
  });
}
