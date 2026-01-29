"use client";

import Link from "next/link";
import { useCompare } from "./CompareProvider";

export function CompareBar() {
  const { selectedIds, count, clearAll } = useCompare();

  if (count === 0) return null;

  const canCompare = count >= 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t-4 border-primary z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            {count} movie{count !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={clearAll}
            className="text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>

        {canCompare ? (
          <Link
            href={`/compare?ids=${selectedIds.join(",")}`}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-primary text-black hover:bg-yellow-300 transition-colors"
          >
            Compare ({count})
          </Link>
        ) : (
          <span className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-border text-muted">
            Compare (2+ required)
          </span>
        )}
      </div>
    </div>
  );
}
