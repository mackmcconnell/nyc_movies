import { getMovieById } from "@/lib/queries";
import { notFound } from "next/navigation";
import { CompareGrid } from "@/components/compare/CompareGrid";

export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids } = await searchParams;

  if (!ids) {
    notFound();
  }

  const movieIds = ids.split(",").map(Number).filter(Boolean);

  if (movieIds.length < 2 || movieIds.length > 5) {
    notFound();
  }

  const movies = await Promise.all(movieIds.map((id) => getMovieById(id)));
  const validMovies = movies.filter(
    (movie): movie is NonNullable<typeof movie> => movie !== null
  );

  if (validMovies.length < 2) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-widest">
          Compare Movies
        </h1>
        <a
          href="/"
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          Back to Browse
        </a>
      </div>

      <CompareGrid movies={validMovies} />
    </div>
  );
}
