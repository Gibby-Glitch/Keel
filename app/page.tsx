"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Hourglass, NotebookPen, Waves } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useSharing } from "@/lib/sharing";
import { Heart } from "lucide-react";
import { currentStreak, dayKey, longestStreak, money, nextMilestone, savedOnDay, totalSaved, uid } from "@/lib/calc";
import { promptForToday } from "@/lib/content";
import type { Habit } from "@/lib/types";
import { TideCard } from "@/components/TideCard";
import { Modal } from "@/components/Modal";
import { Button, Chip, Field, Section, cx, inputCls } from "@/components/ui";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Today() {
  const { state, update } = useStore();
  const today = dayKey();
  const [slipFor, setSlipFor] = useState<Habit | null>(null);
  const { profile } = useAuth();
  const sharing = useSharing();
  const name = state.settings.name || profile?.display_name || "";
  const newFrom = [...new Set(sharing.inbox.filter((r) => !r.read_at).map((r) => sharing.nameOf(r.sender)))];

  const total = totalSaved(state);
  const todaySaved = savedOnDay(state, today);
  const journaledToday = state.journal.some((j) => dayKey(j.ts) === today);
  const [rh, rm] = state.settings.reminderTime.split(":").map(Number);
  const now = new Date();
  const pastReminder = now.getHours() * 60 + now.getMinutes() >= rh * 60 + rm;

  const doneToday = (id: string) => state.replacementLog.some((l) => l.replacementId === id && l.date === today);
  const toggleReplacement = (id: string) =>
    update((s) => {
      const i = s.replacementLog.findIndex((l) => l.replacementId === id && l.date === today);
      if (i >= 0) s.replacementLog.splice(i, 1);
      else s.replacementLog.push({ replacementId: id, date: today });
    });

  return (
    <>
      <header className="mb-7">
        <p className="text-muted">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="font-serif text-[2.25rem] leading-tight tracking-[-0.01em] sm:text-[2.75rem]">
          {greeting()}
          {name ? `, ${name}` : ""}.
        </h1>
      </header>

      {(sharing.unread > 0 || sharing.newReplies > 0) && (
        <Link href="/shared" className="mb-4 flex items-center gap-3 rounded-2xl border border-brass/40 bg-brass-soft px-5 py-4 text-ink">
          <Heart size={20} className="shrink-0 text-brass" />
          <span>
            {sharing.unread > 0
              ? `${newFrom.join(" and ")} sent you ${sharing.unread === 1 ? "an entry" : `${sharing.unread} entries`}.`
              : `You have ${sharing.newReplies === 1 ? "a new reply" : `${sharing.newReplies} new replies`} to entries you sent.`}{" "}
            <span className="font-medium">Read it</span>
          </span>
        </Link>
      )}

      {pastReminder && !journaledToday && (
        <Link
          href="/journal"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-tide/40 bg-tide-soft px-5 py-4 text-tide-deep"
        >
          <NotebookPen size={20} className="shrink-0" />
          <span>
            <span className="font-medium">Evening check-in.</span> Two minutes on how today went keeps your trends honest.
          </span>
        </Link>
      )}

      <TideCard total={total} today={todaySaved} goalName={state.goal.name} goalTarget={state.goal.target} />

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <QuickAction href="/urge" icon={<Waves size={20} />} label="I have an urge" primary />
        <QuickAction href="/journal" icon={<NotebookPen size={20} />} label="Write it out" />
        <QuickAction href="/pause" icon={<Hourglass size={20} />} label="Pause a purchase" />
      </div>

      {state.settings.why && (
        <blockquote className="my-10 border-l-2 border-tide pl-5 font-serif text-[1.25rem] leading-relaxed sm:text-[1.375rem]">
          {state.settings.why}
        </blockquote>
      )}

      <Section title="Breaking" note="A slip resets the streak, never your totals">
        <ul className="divide-y divide-line">
          {state.habits.map((h) => {
            const streak = currentStreak(state, h);
            const best = longestStreak(state, h);
            const next = nextMilestone(streak);
            const prev = [0, 1, 3, 7, 14, 30, 45, 66, 90, 180, 365].filter((m) => m <= streak).at(-1) ?? 0;
            const pct = (streak - prev) / (next - prev);
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-sm text-muted">
                    {h.tracking === "baseline" ? `${money((h.costPer * h.timesPerWeek) / 7, true)} a day banked` : "Savings from items you skip"}
                    {best > streak && `. Best run: ${best} days`}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className="h-full rounded-full bg-tide" style={{ width: `${Math.max(4, pct * 100)}%` }} />
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[13px] text-muted">day {next} next</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="num font-serif text-[2rem] leading-none">{streak}</p>
                  <p className="text-[13px] text-muted">{streak === 1 ? "day" : "days"}</p>
                </div>
                <Button variant="ghost" className="!py-1.5 text-sm" onClick={() => setSlipFor(h)}>
                  Log a slip
                </Button>
              </li>
            );
          })}
        </ul>
      </Section>

      {state.replacements.length > 0 && (
        <Section title="Building" note={`${state.replacements.filter((r) => doneToday(r.id)).length} of ${state.replacements.length} today`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {state.replacements.map((r) => {
              const done = doneToday(r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => toggleReplacement(r.id)}
                    aria-pressed={done}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      done ? "border-tide bg-tide-soft" : "border-line bg-surface hover:border-tide/50",
                    )}
                  >
                    <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border", done ? "border-tide bg-tide text-tide-ink" : "border-line")}>
                      {done && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block font-medium">{r.name}</span>
                      <span className="block text-sm text-muted">{r.when}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {state.commitments.length > 0 && (
        <Section title="Commitments">
          <div className="flex flex-wrap gap-2">
            {state.commitments.map((c) => (
              <Chip key={c} label={c} on tone="brass" />
            ))}
          </div>
        </Section>
      )}

      <Section title="Tonight's question">
        <p className="max-w-[60ch] font-serif text-[1.25rem] leading-relaxed">{promptForToday()}</p>
        <Link href="/journal" className="mt-3 inline-block font-medium text-tide hover:underline">
          Answer in your journal
        </Link>
      </Section>

      <SlipModal key={slipFor?.id ?? "none"} habit={slipFor} onClose={() => setSlipFor(null)} onSave={(spent, note, plan) => {
        if (!slipFor) return;
        update((s) => {
          s.slips.push({ id: uid(), habitId: slipFor.id, date: today, spent, note });
          if (plan.cue && plan.response) s.plans.push({ id: uid(), habitId: slipFor.id, ...plan });
          if (note) s.journal.push({ id: uid(), ts: Date.now(), mood: 2, craving: 5, ease: 2, tags: ["Slip"], body: note });
        });
        setSlipFor(null);
      }} />
    </>
  );
}

function QuickAction({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "flex flex-col items-start gap-3 rounded-2xl border px-4 py-4 text-[15px] font-medium leading-tight transition sm:flex-row sm:items-center",
        primary ? "border-tide bg-tide text-tide-ink hover:brightness-110" : "border-line bg-surface hover:border-tide/50",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function SlipModal({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit | null;
  onClose: () => void;
  onSave: (spent: number, note: string, plan: { cue: string; response: string }) => void;
}) {
  const [spent, setSpent] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [cue, setCue] = useState("");
  const [response, setResponse] = useState("");
  return (
    <Modal open={!!habit} onClose={onClose} title="A slip, not a reset">
      <p className="mb-5 text-muted">
        One slip doesn't erase what you've built. Your savings and your best run stay. What you write here becomes the
        plan for next time.
      </p>
      <div className="space-y-4">
        <Field label="What did it cost?">
          <input className={`${inputCls} num`} type="number" min={0} defaultValue={habit?.costPer} onChange={(e) => setSpent(Number(e.target.value) || 0)} />
        </Field>
        <Field label="What was going on?">
          <textarea className={`${inputCls} min-h-20`} placeholder="Long day, drove past the store, told myself just one…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <fieldset className="rounded-2xl border border-line p-4">
          <legend className="px-1 text-sm font-medium">Turn it into a plan</legend>
          <div className="grid gap-3">
            <input className={inputCls} placeholder="If… (the moment it started)" value={cue} onChange={(e) => setCue(e.target.value)} aria-label="If" />
            <input className={inputCls} placeholder="Then I will…" value={response} onChange={(e) => setResponse(e.target.value)} aria-label="Then" />
          </div>
        </fieldset>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(spent ?? habit?.costPer ?? 0, note.trim(), { cue: cue.trim(), response: response.trim() })}>Log slip</Button>
      </div>
    </Modal>
  );
}
