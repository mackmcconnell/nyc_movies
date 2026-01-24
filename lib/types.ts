export interface Theater {
  id: number;
  name: string;
  url: string;
  slug: string;
}

export interface Movie {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  runtime: number | null;
  description: string | null;
  trailer_url: string | null;
  image_url: string | null;
}

export interface Showtime {
  id: number;
  movie_id: number;
  theater_id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  ticket_url: string | null;
}

// Combined type for display
export interface MovieWithShowtimes extends Movie {
  showtimes: (Showtime & { theater: Theater })[];
}
