"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { dayKey, money, uid } from "@/lib/calc";
import { COMMITMENT_CHIPS, SAFETY } from "@/lib/content";
import { sampleState, useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { Button, Chip, Field, inputCls } from "./ui";
import { Logo } from "./Shell";

const PRESETS: Omit<Habit, "id" | "startDate">[] = [
  { name: "Evening beer or wine run", kind: "drink", tracking: "baseline", costPer: 16, timesPerWeek: 5 },
  { name: "Amazon impulse buys", kind: "spend", tracking: "logged", costPer: 35, timesPerWeek: 2 },
  { name: "Instagram & TikTok shopping", kind: "spend", tracking: "logged", costPer: 40, timesPerWeek: 1 },
  { name: "Gas-station snacks & drinks", kind: "spend", tracking: "baseline", costPer: 8, timesPerWeek: 5 },
];

export function Onboarding() {
  const { update, replace, legacy, claimLegacy, dismissLegacy } = useStore();
  const [step, setStep] = useState(0);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goal, setGoal] = useState({ name: "Emergency fund", target: 1000 });
  const [why, setWhy] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  const today = dayKey();
  const toggleHabit = (p: (typeof PRESETS)[number]) =>
    setHabits((hs) =>
      hs.some((h) => h.name === p.name) ? hs.filter((h) => h.name !== p.name) : [...hs, { ...p, id: uid(), startDate: today }],
    );
  const patch = (id: string, v: Partial<Habit>) => setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...v } : h)));

  const finish = () =>
    update((s) => {
      s.habits = habits;
      s.goal = goal;
      s.commitments = chips;
      s.settings.why = why;
      s.settings.onboarded = true;
    });

  const weekly = habits.filter((h) => h.tracking === "baseline").reduce((a, h) => a + h.costPer * h.timesPerWeek, 0);

  return (
    <div className="min-h-dvh px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-[640px]">
        <Logo />
        <ol className="mt-8 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <li key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-tide" : "bg-line"}`} />
          ))}
        </ol>

        {step === 0 && legacy && (
          <div className="mt-10 rounded-2xl border border-tide/40 bg-tide-soft p-5 text-tide-deep">
            <p className="font-medium">There's a journal saved on this device from before accounts.</p>
            <p className="mt-1 text-[15px]">
              It has {legacy.journal.length} journal {legacy.journal.length === 1 ? "entry" : "entries"} and {legacy.habits.length}{" "}
              {legacy.habits.length === 1 ? "habit" : "habits"}. If it's yours, add it to your account. If it belongs to someone else
              who uses this device, leave it for them.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={claimLegacy}>It's mine, add it</Button>
              <Button variant="ghost" onClick={dismissLegacy}>Not mine</Button>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="mt-10">
            <h1 className="font-serif text-[2.5rem] leading-[1.08] tracking-[-0.01em] sm:text-[3.25rem]">
              Stop the run to the store. Keep the money and the mornings.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[17px] text-muted">
              Keel is a private journal for breaking habits that cost you — the nightly six-pack, the bottle of wine, the
              late-night Amazon cart. It counts what you save, helps you ride out urges as they happen, and shows you,
              week by week, that it is getting easier.
            </p>
            <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-[15px]">
              <p className="font-medium">Before you start</p>
              <p className="mt-1 text-muted">{SAFETY.withdrawal}</p>
              <p className="mt-2 text-muted">
                {SAFETY.samhsa.label}: <a className="font-medium text-tide underline-offset-2 hover:underline" href={`tel:${SAFETY.samhsa.phone}`}>{SAFETY.samhsa.phone}</a> — {SAFETY.samhsa.note.toLowerCase()}.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => setStep(1)}>Set up my plan</Button>
              <Button variant="ghost" onClick={() => replace(sampleState())}>
                Explore with sample data
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-10">
            <h1 className="font-serif text-[2.25rem] leading-tight">What are you changing?</h1>
            <p className="mt-2 text-muted">Pick what fits, then set what it usually costs. You can change this later.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip key={p.name} label={p.name} on={habits.some((h) => h.name === p.name)} onClick={() => toggleHabit(p)} />
              ))}
              <Chip
                label="+ Something else"
                onClick={() =>
                  setHabits((hs) => [...hs, { id: uid(), name: "", kind: "other", tracking: "baseline", costPer: 10, timesPerWeek: 3, startDate: today }])
                }
              />
            </div>

            <div className="mt-6 space-y-4">
              {habits.map((h) => (
                <HabitEditor key={h.id} h={h} onChange={(v) => patch(h.id, v)} onRemove={() => setHabits((hs) => hs.filter((x) => x.id !== h.id))} />
              ))}
            </div>

            {weekly > 0 && (
              <p className="mt-6 text-[15px] text-muted">
                Your routines cost about <span className="num font-semibold text-brass">{money(weekly)}</span> a week —{" "}
                <span className="num font-semibold text-brass">{money(weekly * 52)}</span> a year.
              </p>
            )}

            <div className="mt-8 flex gap-3">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!habits.length || habits.some((h) => !h.name.trim())} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-10">
            <h1 className="font-serif text-[2.25rem] leading-tight">Where is the money going instead?</h1>
            <p className="mt-2 text-muted">A concrete goal turns “not buying” into “building.”</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Savings goal">
                <input className={inputCls} value={goal.name} onChange={(e) => setGoal({ ...goal, name: e.target.value })} />
              </Field>
              <Field label="Target">
                <input
                  className={`${inputCls} num`}
                  type="number"
                  min={1}
                  value={goal.target}
                  onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <div className="mt-6">
              <Field label="Why are you doing this?" hint="You'll see this when an urge hits. Write it to yourself, in your own words.">
                <textarea
                  className={`${inputCls} min-h-24 font-serif text-[17px]`}
                  placeholder="I want to wake up clear and stop watching my paycheck disappear…"
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </Field>
            </div>

            <p className="mt-6 text-sm font-medium">Commitments</p>
            <p className="text-sm text-muted">Choose the ones you're making. They show on your Today screen.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMMITMENT_CHIPS.map((c) => (
                <Chip key={c} label={c} on={chips.includes(c)} onClick={() => setChips((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} />
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={finish}>Start today</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HabitEditor({ h, onChange, onRemove }: { h: Habit; onChange: (v: Partial<Habit>) => void; onRemove: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-2">
        <input
          className={`${inputCls} font-medium`}
          placeholder="Name the habit"
          aria-label="Habit name"
          value={h.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button type="button" onClick={onRemove} aria-label="Remove habit" className="rounded-xl px-3 text-muted hover:text-ember">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Field label="Type">
          <select className={inputCls} value={h.kind} onChange={(e) => onChange({ kind: e.target.value as Habit["kind"] })}>
            <option value="drink">Drinking</option>
            <option value="spend">Spending</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Cost each time">
          <input className={`${inputCls} num`} type="number" min={0} value={h.costPer} onChange={(e) => onChange({ costPer: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Times a week">
          <input className={`${inputCls} num`} type="number" min={0} max={21} value={h.timesPerWeek} onChange={(e) => onChange({ timesPerWeek: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Started">
          <input className={`${inputCls} num`} type="date" value={h.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </Field>
      </div>
      <fieldset className="mt-3">
        <legend className="mb-1 text-sm font-medium">Count savings by</legend>
        <div className="flex flex-wrap gap-2">
          <Chip label="Daily estimate" on={h.tracking === "baseline"} onClick={() => onChange({ tracking: "baseline" })} />
          <Chip label="Items I skip" on={h.tracking === "logged"} onClick={() => onChange({ tracking: "logged" })} />
        </div>
        <p className="mt-1.5 text-sm text-muted">
          {h.tracking === "baseline"
            ? "Best for a routine with a steady cost. You bank the usual cost every day you don't do it."
            : "Best for irregular buys. Savings count only when you log a specific item you passed on — real money, not a guess."}
        </p>
      </fieldset>
    </div>
  );
}

