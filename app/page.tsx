import { getMoviesByDate, getTheaters } from "@/lib/queries";
import HomeClient from "@/components/HomeClient";

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

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch all data at request time
  const dates = getNext7Days();
  const theaters = await getTheaters();

  const datesWithMovies = await Promise.all(
    dates.map(async (date, index) => {
      const dateStr = formatDateForApi(date);
      const moviesForDate = await getMoviesByDate(dateStr);

      // Transform to the format expected by the client
      const movies = moviesForDate.map((movie) => ({
        id: movie.id,
        title: movie.title,
        director: movie.director,
        year: movie.year,
        runtime: movie.runtime,
        description: movie.description,
        trailer_url: movie.trailer_url,
        showtimes: movie.showtimes.map((st) => ({
          time: st.time,
          theater_name: st.theater.name,
          theater_slug: st.theater.slug,
          ticket_url: st.ticket_url,
        })),
      }));

      return {
        date: dateStr,
        label: formatDateLabel(date, index),
        movies,
      };
    })
  );

  return (
    <HomeClient
      dates={datesWithMovies}
      theaters={theaters}
    />
  );
}
