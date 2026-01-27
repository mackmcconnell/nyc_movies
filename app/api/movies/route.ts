import { NextRequest, NextResponse } from "next/server";
import { getMoviesByDate } from "@/lib/queries";

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");

  const date = dateParam || getTodayDate();

  if (!isValidDateFormat(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const moviesWithShowtimes = getMoviesByDate(date);

  const movies = moviesWithShowtimes.map((movie) => {
    // Sort showtimes by time
    const sortedShowtimes = movie.showtimes
      .map((showtime) => ({
        time: showtime.time,
        theater_name: showtime.theater.name,
        theater_slug: showtime.theater.slug,
        ticket_url: showtime.ticket_url,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return {
      id: movie.id,
      title: movie.title,
      director: movie.director,
      year: movie.year,
      runtime: movie.runtime,
      description: movie.description,
      trailer_url: movie.trailer_url,
      showtimes: sortedShowtimes,
      // Use earliest showtime for sorting movies
      earliestTime: sortedShowtimes[0]?.time || "99:99",
    };
  });

  // Sort movies by earliest showtime
  movies.sort((a, b) => a.earliestTime.localeCompare(b.earliestTime));

  // Remove earliestTime from response
  const response = movies.map(({ earliestTime, ...movie }) => movie);

  return NextResponse.json({
    date,
    movies: response,
  });
}
