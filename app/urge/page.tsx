"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dayKey, money, uid } from "@/lib/calc";
import { HALT, SAFETY, TRIGGERS } from "@/lib/content";
import { Button, Chip, Field, PageHead, cx, inputCls } from "@/components/ui";

/** Urge-surfing guidance, paced across the ride-out. Written for this app. */
const GUIDE = [
  "Notice where the urge lives in your body — chest, throat, hands, stomach. Just notice.",
  "Breathe with the circle. In as it grows, out as it shrinks.",
  "Give the urge a number from 0 to 10. You don't have to act on it, only watch it.",
  "Urges behave like waves: they build, crest and fall. You're riding this one, not fighting it.",
  "If a thought says “just one,” label it: that's the habit talking.",
  "Check the number again. Higher, lower, the same? All of those are fine.",
  "Picture tomorrow morning — clear head, money still in the account.",
  "The crest usually passes within 20 to 30 minutes. You're already part of the way through.",
];

const DURATIONS = [5, 10, 15];

export default function UrgePage() {
  const { state, update } = useStore();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [habitId, setHabitId] = useState<string | undefined>(state.habits[0]?.id);
  const [intensity, setIntensity] = useState(7);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [halt, setHalt] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(10);
  const [endIntensity, setEndIntensity] = useState(4);
  const [amount, setAmount] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"rode-it-out" | "gave-in" | null>(null);

  const habit = state.habits.find((h) => h.id === habitId);
  const plans = useMemo(
    () => state.plans.filter((p) => !p.habitId || p.habitId === habitId),
    [state.plans, habitId],
  );
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = (outcome: "rode-it-out" | "gave-in") => {
    update((s) => {
      s.urges.push({
        id: uid(),
        ts: Date.now(),
        habitId,
        intensity,
        endIntensity,
        triggers,
        halt,
        outcome,
        amountAvoided: outcome === "rode-it-out" && amount ? Number(amount) : undefined,
        note: note.trim() || undefined,
      });
      if (outcome === "gave-in" && habitId)
        s.slips.push({ id: uid(), habitId, date: dayKey(), spent: Number(amount) || habit?.costPer || 0, note: note.trim() || undefined });
    });
    setResult(outcome);
    setStep(3);
  };

  return (
    <>
      <PageHead
        title={step === 3 ? (result === "rode-it-out" ? "You rode it out." : "Logged. Tomorrow is a clean page.") : "Ride out the urge"}
        lede={
          step === 0
            ? "You opened this instead of the car door. That's the skill. Let's take a look at what's happening."
            : step === 1
              ? "Stay with it until the timer ends. You can stop early if it passes."
              : undefined
        }
      />

      {step === 0 && (
        <div className="space-y-8">
          {state.habits.length > 1 && (
            <div>
              <p className="mb-2 font-medium">What's the urge for?</p>
              <div className="flex flex-wrap gap-2">
                {state.habits.map((h) => (
                  <Chip key={h.id} label={h.name} on={habitId === h.id} onClick={() => setHabitId(h.id)} />
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="int" className="font-medium">How strong is it right now?</label>
              <span className="num font-serif text-[2rem] leading-none">{intensity}</span>
            </div>
            <input id="int" type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-[13px] text-muted"><span>Barely there</span><span>Overwhelming</span></div>
          </div>
          <div>
            <p className="mb-2 font-medium">What set it off?</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map((t) => (
                <Chip key={t} label={t} on={triggers.includes(t)} onClick={() => toggle(triggers, setTriggers, t)} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium">Quick check: are you…</p>
            <p className="mb-2 text-sm text-muted">Cravings often stand in for one of these four needs.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {HALT.map((h) => {
                const on = halt.includes(h.key);
                return (
                  <button
                    key={h.key}
                    aria-pressed={on}
                    onClick={() => toggle(halt, setHalt, h.key)}
                    className={cx("rounded-2xl border px-4 py-3 text-left transition", on ? "border-tide bg-tide-soft" : "border-line bg-surface hover:border-tide/50")}
                  >
                    <span className="font-medium">{h.key}?</span>
                    {on && <span className="mt-1 block text-sm text-tide-deep">{h.hint}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">Ride it out for</span>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} min`} on={minutes === d} onClick={() => setMinutes(d)} />
            ))}
          </div>
          <Button onClick={() => setStep(1)} className="w-full sm:w-auto">Start the ride-out</Button>
        </div>
      )}

      {step === 1 && <RideOut minutes={minutes} plans={plans} why={state.settings.why} onDone={() => { setEndIntensity(Math.max(0, intensity - 3)); setStep(2); }} />}

      {step === 2 && (
        <div className="space-y-7">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="end" className="font-medium">Where's the urge now?</label>
              <span className="num font-serif text-[2rem] leading-none">
                {endIntensity}
                <span className="ml-2 text-base text-muted">from {intensity}</span>
              </span>
            </div>
            <input id="end" type="range" min={0} max={10} value={endIntensity} onChange={(e) => setEndIntensity(Number(e.target.value))} className="w-full" />
          </div>
          <Field
            label={habit?.tracking === "logged" ? "What would it have cost?" : "Spent anything? (only if you gave in)"}
            hint={habit?.tracking === "logged" ? "Counts toward your savings when you ride it out." : `Your daily ${money(habit?.costPer ?? 0)} is already banked if you held.`}
          >
            <input className={`${inputCls} num max-w-[200px]`} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
          <Field label="Anything worth remembering?">
            <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="It peaked around minute four, then the walk helped…" />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => save("rode-it-out")}>I rode it out</Button>
            <Button variant="ghost" onClick={() => save("gave-in")}>I gave in this time</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-[60ch] space-y-5">
          {result === "rode-it-out" ? (
            <p className="font-serif text-[1.375rem] leading-relaxed">
              The urge went from <span className="num">{intensity}</span> to <span className="num">{endIntensity}</span> without you
              feeding it. Every time that happens, the habit loop gets a little weaker — and you have one more piece of proof that it passes.
            </p>
          ) : (
            <p className="font-serif text-[1.375rem] leading-relaxed">
              One slip is information, not a verdict. You noticed it, you named the trigger, and your savings and best streak are
              still yours. Consider turning tonight's trigger into an if-then plan.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/journal"><Button>Write about it</Button></Link>
            <Link href={result === "gave-in" ? "/plan" : "/"}><Button variant="ghost">{result === "gave-in" ? "Add a plan" : "Back to today"}</Button></Link>
          </div>
        </div>
      )}

      <aside className="mt-14 border-t border-line pt-5 text-sm text-muted">
        If you feel unsafe or in crisis, call or text <a href="tel:988" className="font-medium text-tide">988</a>. For treatment
        referrals: {SAFETY.samhsa.label}, <a href={`tel:${SAFETY.samhsa.phone}`} className="font-medium text-tide">{SAFETY.samhsa.phone}</a>.
      </aside>
    </>
  );
}

function RideOut({ minutes, plans, why, onDone }: { minutes: number; plans: { id: string; cue: string; response: string }[]; why: string; onDone: () => void }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);
  const elapsed = total - left;
  const line = GUIDE[Math.min(GUIDE.length - 1, Math.floor((elapsed / total) * GUIDE.length))];
  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="flex flex-col items-center">
        <div className="relative grid h-64 w-64 place-items-center">
          <div className="breathe absolute inset-0 rounded-full bg-tide-soft" aria-hidden />
          <div className="absolute inset-6 rounded-full border border-tide/30" aria-hidden />
          <p className="num relative font-serif text-[3.5rem] leading-none" aria-live="off">
            {mm}:{ss}
          </p>
        </div>
        <p className="mt-6 max-w-[34ch] text-center font-serif text-[1.25rem] leading-relaxed" aria-live="polite">{line}</p>
        <button onClick={onDone} className="mt-6 text-sm font-medium text-tide hover:underline">It's passed — finish now</button>
      </div>
      <div className="space-y-6">
        {why && (
          <div>
            <p className="mb-1 text-sm text-muted">Your reason</p>
            <p className="font-serif text-[1.25rem] leading-relaxed">{why}</p>
          </div>
        )}
        {plans.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted">Your plans for this moment</p>
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="rounded-2xl border border-line bg-surface px-4 py-3 text-[15px]">
                  <span className="text-muted">If</span> {p.cue}, <span className="text-muted">then</span> <span className="font-medium">{p.response}</span>.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
