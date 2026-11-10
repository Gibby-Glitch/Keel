"use client";

import { money, translateSavings } from "@/lib/calc";

/**
 * The hero: money saved, drawn as water rising inside the card toward the
 * savings goal. The water level is the goal progress.
 */
export function TideCard({ total, today, goalName, goalTarget }: { total: number; today: number; goalName: string; goalTarget: number }) {
  const pct = goalTarget > 0 ? Math.min(1, total / goalTarget) : 0;
  const level = 14 + pct * 70; // keep a sliver of water even at zero
  const idea = translateSavings(total);
  return (
    <section
      aria-label="Money saved"
      className="relative isolate overflow-hidden rounded-[28px] border border-line bg-surface px-6 pb-7 pt-6 sm:px-9 sm:pt-8"
    >
      <div className="absolute inset-x-0 bottom-0 -z-10" style={{ height: `${level}%` }} aria-hidden>
        <svg className="tide-wave absolute -top-[18px] left-0 h-[20px] w-[200%]" viewBox="0 0 1200 20" preserveAspectRatio="none">
          <path d="M0 10 C100 0 200 0 300 10 S500 20 600 10 S800 0 900 10 S1100 20 1200 10 V20 H0Z" fill="var(--tide-soft)" />
        </svg>
        <div className="h-full w-full bg-tide-soft" />
      </div>

      <p className="text-[15px] text-muted">Kept in your pocket so far</p>
      <p className="num mt-1 font-serif text-[4rem] leading-none tracking-[-0.02em] text-brass sm:text-[5.5rem]">{money(total)}</p>

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-[15px]">
        <div>
          <p className="text-muted">Today</p>
          <p className="num text-[1.375rem] font-semibold">{today >= 0 ? "+" : "−"}{money(Math.abs(today), true)}</p>
        </div>
        <div>
          <p className="text-muted">{goalName}</p>
          <p className="num text-[1.375rem] font-semibold">
            {Math.round(pct * 100)}% <span className="text-[15px] font-normal text-muted">of {money(goalTarget)}</span>
          </p>
        </div>
      </div>
      {idea && <p className="mt-5 max-w-[46ch] font-serif text-[1.125rem] italic text-tide-deep">That's {idea.text}.</p>}
    </section>
  );
}
