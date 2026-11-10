"use client";

import { useMemo, useState } from "react";
import { Heart, RefreshCw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import { PROMPTS, TRIGGERS, promptForToday } from "@/lib/content";
import { sentTo, useSharing } from "@/lib/sharing";
import type { JournalEntry } from "@/lib/types";
import { EntryBody } from "@/components/EntryCard";
import { SendEntryModal } from "@/components/SendEntry";
import { EASE, MOODS } from "@/lib/content";
import { Button, Chip, Empty, PageHead, Scale, Section, inputCls } from "@/components/ui";

const EXTRA_TAGS = ["Win", "Grateful", "Slip", "Proud", "Hard day", "Money moved to savings"];

export default function JournalPage() {
  const { state, update } = useStore();
  const [prompt, setPrompt] = useState(promptForToday());
  const [mood, setMood] = useState(3);
  const [craving, setCraving] = useState(4);
  const [ease, setEase] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [saved, setSaved] = useState<JournalEntry | null>(null);
  const [sending, setSending] = useState<JournalEntry | null>(null);
  const sharing = useSharing();
  const partnerName = sharing.partners[0]?.display_name;

  const entries = useMemo(
    () => [...state.journal].sort((a, b) => b.ts - a.ts).filter((e) => !filter || e.tags.includes(filter)),
    [state.journal, filter],
  );
  const allTags = useMemo(() => [...new Set(state.journal.flatMap((e) => e.tags))].sort(), [state.journal]);

  const save = () => {
    const entry: JournalEntry = { id: uid(), ts: Date.now(), mood, craving, ease, tags, body: body.trim(), prompt };
    update((s) => {
      s.journal.push(entry);
    });
    setBody("");
    setTags([]);
    setSaved(entry);
  };

  const shuffle = () => {
    const others = PROMPTS.filter((p) => p !== prompt);
    setPrompt(others[Math.floor(Math.random() * others.length)]);
  };

  return (
    <>
      <PageHead title="Journal" lede="Say how it went. Over weeks, these few numbers become the story of it getting easier." />

      <section className="mb-12 rounded-[28px] border border-line bg-surface p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[56ch] font-serif text-[1.25rem] leading-relaxed">{prompt}</p>
          <button onClick={shuffle} className="shrink-0 rounded-full p-2 text-muted hover:bg-tide-soft hover:text-tide" aria-label="Show a different question">
            <RefreshCw size={18} />
          </button>
        </div>
        <textarea
          className={`${inputCls} mt-4 min-h-40 font-serif text-[1.125rem] leading-[1.7]`}
          placeholder="Write as much or as little as you want…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Journal entry"
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Mood</p>
            <Scale name="Mood" value={mood} onChange={setMood} options={MOODS} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">How hard was today?</p>
            <Scale name="Ease" value={ease} onChange={setEase} options={EASE.map((e) => ({ ...e, label: e.label.replace("Barely thought about it", "Barely noticed") }))} />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="crave" className="text-sm font-medium">Strongest craving today</label>
            <span className="num font-serif text-[1.5rem] leading-none">{craving}</span>
          </div>
          <input id="crave" type="range" min={0} max={10} value={craving} onChange={(e) => setCraving(Number(e.target.value))} className="w-full" />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-2">
            {[...EXTRA_TAGS, ...TRIGGERS].map((t) => (
              <Chip key={t} label={t} on={tags.includes(t)} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
            ))}
          </div>
        </div>

        <div className="mt-7 flex items-center gap-4">
          <Button onClick={save} disabled={!body.trim() && tags.length === 0}>Save entry</Button>
          {saved && (
            <span role="status" className="flex flex-wrap items-center gap-3 text-[15px] text-tide">
              Saved to your private journal.
              {sharing.enabled && partnerName && (
                <button onClick={() => setSending(saved)} className="font-medium underline-offset-2 hover:underline">
                  Send it to {partnerName}
                </button>
              )}
            </span>
          )}
        </div>
      </section>

      <Section
        title="Past entries"
        note={`${state.journal.length} ${state.journal.length === 1 ? "entry" : "entries"}`}
      >
        {allTags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip label="All" on={!filter} onClick={() => setFilter(null)} />
            {allTags.map((t) => (
              <Chip key={t} label={t} on={filter === t} onClick={() => setFilter(filter === t ? null : t)} />
            ))}
          </div>
        )}
        {entries.length === 0 ? (
          <Empty>Your first entry will show here. Start with a single sentence about today.</Empty>
        ) : (
          <ol className="divide-y divide-line">
            {entries.slice(0, 60).map((e) => (
              <li key={e.id} className="group py-5">
                <EntryBody e={e} />
                <div className="mt-3 flex items-center justify-end gap-1">
                  {sharing.enabled && (() => {
                    const to = sentTo(sharing.sent, e.id);
                    return to.length ? (
                      <span className="mr-auto flex items-center gap-1.5 text-[13px] text-muted">
                        <Heart size={14} className="text-tide" /> Sent to {to.map(sharing.nameOf).join(", ")}
                      </span>
                    ) : (
                      <button
                        onClick={() => setSending(e)}
                        className="mr-auto flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-tide hover:bg-tide-soft"
                      >
                        <Heart size={14} /> {partnerName ? `Send to ${partnerName}` : "Share"}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => confirm("Delete this entry from your journal?") && update((s) => { s.journal = s.journal.filter((x) => x.id !== e.id); })}
                    className="rounded-full p-1.5 text-muted opacity-0 transition hover:text-ember focus:opacity-100 group-hover:opacity-100"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
      {sending && <SendEntryModal key={sending.id} entry={sending} onClose={() => setSending(null)} />}
    </>
  );
}
