"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { hourBuckets, money, savingsSeries, totalSaved, triggerCounts, weeklyAverage } from "@/lib/calc";
import { Bars, LineChart } from "@/components/Charts";
import { Empty, PageHead, Section } from "@/components/ui";

export default function InsightsPage() {
  const { state } = useStore();

  const series = useMemo(
    () => savingsSeries(state, 30).map((d) => ({ label: new Date(`${d.day}T12:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: d.value })),
    [state],
  );
  const craving = useMemo(() => weeklyAverage(state.journal, (j) => j.ts, (j) => j.craving), [state.journal]);
  const ease = useMemo(() => weeklyAverage(state.journal, (j) => j.ts, (j) => j.ease), [state.journal]);
  const urgeDrop = useMemo(
    () => weeklyAverage(state.urges.filter((u) => u.endIntensity !== undefined), (u) => u.ts, (u) => u.intensity),
    [state.urges],
  );
  const triggers = triggerCounts(state).filter(([t]) => t !== "Slip").slice(0, 7);
  const hours = hourBuckets(state);

  const ridden = state.urges.filter((u) => u.outcome === "rode-it-out").length;
  const avgDrop = (() => {
    const xs = state.urges.filter((u) => u.endIntensity !== undefined);
    return xs.length ? xs.reduce((a, u) => a + (u.intensity - (u.endIntensity ?? u.intensity)), 0) / xs.length : null;
  })();

  const story = useMemo(() => {
    const lines: string[] = [];
    const c = craving.filter((x) => x.value !== null) as { value: number }[];
    if (c.length >= 3) {
      const first = c.slice(0, 2).reduce((a, x) => a + x.value, 0) / 2;
      const last = c.slice(-2).reduce((a, x) => a + x.value, 0) / 2;
      if (last < first - 0.5) lines.push(`Your average craving has dropped from ${first.toFixed(1)} to ${last.toFixed(1)} out of 10.`);
      else if (last > first + 0.5) lines.push(`Cravings have run higher lately (${last.toFixed(1)} vs ${first.toFixed(1)}). Look at what changed — sleep, stress, schedule.`);
      else lines.push("Cravings have held steady. Steady is fine; it's the days you don't act on them that count.");
    }
    const e = ease.filter((x) => x.value !== null) as { value: number }[];
    if (e.length >= 3 && e.at(-1)!.value > e[0].value + 0.4) lines.push("Days are getting easier — your own ratings say so.");
    if (triggers[0]) lines.push(`“${triggers[0][0]}” is your most common trigger. It's the best place for a new if-then plan or a bit of friction.`);
    const peak = [...hours].sort((a, b) => b.n - a.n)[0];
    if (peak?.n) lines.push(`Most urges hit in the ${peak.label.toLowerCase()}. Plan that window in advance.`);
    if (avgDrop !== null) lines.push(`When you ride an urge out, it falls by ${avgDrop.toFixed(1)} points on average.`);
    return lines;
  }, [craving, ease, triggers, hours, avgDrop]);

  const hasData = state.journal.length + state.urges.length > 0;

  return (
    <>
      <PageHead title="Insights" lede="What your own logs say about where the habit is strong and where it's fading." />

      <dl className="mb-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <Stat label="Saved in total" value={money(totalSaved(state))} money />
        <Stat label="Urges ridden out" value={String(ridden)} />
        <Stat label="Average urge drop" value={avgDrop === null ? "—" : `${avgDrop.toFixed(1)} pts`} />
        <Stat label="Journal entries" value={String(state.journal.length)} />
      </dl>

      {story.length > 0 && (
        <Section title="What's changing">
          <ul className="max-w-[64ch] space-y-3 font-serif text-[1.1875rem] leading-relaxed">
            {story.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Money kept, last 30 days">
        <LineChart data={series} area format={(v) => money(v)} label="Cumulative money saved over the last 30 days" />
      </Section>

      {!hasData ? (
        <Empty>Log a few urges and journal entries and your trends will appear here.</Empty>
      ) : (
        <>
          <div className="grid gap-x-10 md:grid-cols-2">
            <Section title="Craving strength" note="Weekly average, 0–10">
              <LineChart data={craving} yMin={0} yMax={10} height={160} label="Weekly average craving strength" />
            </Section>
            <Section title="How easy days feel" note="Weekly average, 1–5">
              <LineChart data={ease} yMin={1} yMax={5} height={160} label="Weekly average ease rating" />
            </Section>
          </div>

          <div className="grid gap-x-10 md:grid-cols-2">
            <Section title="Top triggers">
              {triggers.length ? <Bars data={triggers.map(([label, value]) => ({ label, value }))} /> : <Empty>Tag triggers when you log an urge.</Empty>}
            </Section>
            <Section title="When urges hit">
              <Bars data={hours.map((h) => ({ label: h.label, value: h.n }))} />
            </Section>
          </div>

          <Section title="Urge intensity at the start" note="Weekly average, 0–10">
            <LineChart data={urgeDrop} yMin={0} yMax={10} height={140} label="Weekly average starting urge intensity" />
          </Section>
        </>
      )}
    </>
  );
}

function Stat({ label, value, money: isMoney }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`num mt-1 font-serif text-[2rem] leading-none ${isMoney ? "text-brass" : ""}`}>{value}</dd>
    </div>
  );
}
