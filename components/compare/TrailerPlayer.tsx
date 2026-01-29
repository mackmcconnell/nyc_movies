"use client";

import { getYouTubeId } from "@/lib/youtube";

interface TrailerPlayerProps {
  trailerUrl: string | null;
  title: string;
  autoplay?: boolean;
  muted?: boolean;
  expanded?: boolean;
}

export default function TrailerPlayer({
  trailerUrl,
  title,
  autoplay = false,
  muted = false,
  expanded = false,
}: TrailerPlayerProps) {
  const youtubeId = trailerUrl ? getYouTubeId(trailerUrl) : null;

  if (!youtubeId) {
    return (
      <div className="aspect-video bg-border flex items-center justify-center">
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          No Trailer Available
        </span>
      </div>
    );
  }

  // Build YouTube embed URL with parameters
  const embedUrl = new URL(`https://www.youtube.com/embed/${youtubeId}`);
  if (autoplay) embedUrl.searchParams.set("autoplay", "1");
  if (muted) embedUrl.searchParams.set("mute", "1");
  embedUrl.searchParams.set("enablejsapi", "1");

  return (
    <div className={`aspect-video ${expanded ? "max-w-3xl mx-auto" : ""}`}>
      <iframe
        src={embedUrl.toString()}
        title={`${title} Trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
