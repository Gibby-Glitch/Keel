"use client";

import { EASE, MOODS } from "@/lib/content";
import type { JournalEntry } from "@/lib/types";

export function entryStats(e: JournalEntry) {
  return `Mood ${MOODS[e.mood - 1]?.label.toLowerCase() ?? "—"}, craving ${e.craving}/10, ${EASE[e.ease - 1]?.label.toLowerCase() ?? ""}`;
}

/** A journal entry as written — used in the journal list, previews and the shared inbox. */
export function EntryBody({ e, compact }: { e: JournalEntry; compact?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{new Date(e.ts).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        <p className="num text-sm text-muted">{entryStats(e)}</p>
      </div>
      {e.prompt && !compact && <p className="mt-2 text-sm text-muted">{e.prompt}</p>}
      {e.body && (
        <p className={`mt-2 max-w-[64ch] whitespace-pre-wrap font-serif leading-[1.7] ${compact ? "line-clamp-4 text-[1rem]" : "text-[1.0625rem]"}`}>{e.body}</p>
      )}
      {e.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.tags.map((t) => (
            <span key={t} className="rounded-full bg-tide-soft px-2.5 py-0.5 text-[13px] text-tide-deep">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
