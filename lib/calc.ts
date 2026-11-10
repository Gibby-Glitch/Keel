import type { AppState, Habit } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Local-time YYYY-MM-DD. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === "number" ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const money = (n: number, cents = false) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

export const dailyBaseline = (h: Habit) => (h.costPer * h.timesPerWeek) / 7;

/** Money saved on one specific day (local), across all habits. */
export function savedOnDay(s: AppState, day: string): number {
  let total = 0;
  for (const h of s.habits) {
    if (day < h.startDate) continue;
    if (h.tracking === "baseline") {
      const spent = s.slips
        .filter((x) => x.habitId === h.id && x.date === day)
        .reduce((a, x) => a + x.spent, 0);
      total += dailyBaseline(h) - spent;
    }
  }
  total += loggedSavingsOnDay(s, day);
  return total;
}

function loggedSavingsOnDay(s: AppState, day: string): number {
  let t = 0;
  for (const p of s.pause)
    if (p.decision === "skipped" && p.decidedTs && dayKey(p.decidedTs) === day) t += p.price;
  for (const u of s.urges)
    if (u.outcome === "rode-it-out" && u.amountAvoided && dayKey(u.ts) === day) {
      // Only count urge savings for logged habits or urges with no habit —
      // baseline habits already include the avoided cost.
      const h = s.habits.find((x) => x.id === u.habitId);
      if (!h || h.tracking === "logged") t += u.amountAvoided;
    }
  return t;
}

export function totalSaved(s: AppState, today = dayKey()): number {
  let total = 0;
  for (const h of s.habits) {
    if (h.tracking !== "baseline") continue;
    const days = Math.max(0, daysBetween(h.startDate, today) + 1);
    const spent = s.slips.filter((x) => x.habitId === h.id).reduce((a, x) => a + x.spent, 0);
    total += days * dailyBaseline(h) - spent;
  }
  for (const p of s.pause) if (p.decision === "skipped") total += p.price;
  for (const u of s.urges) {
    if (u.outcome !== "rode-it-out" || !u.amountAvoided) continue;
    const h = s.habits.find((x) => x.id === u.habitId);
    if (!h || h.tracking === "logged") total += u.amountAvoided;
  }
  return Math.max(0, total);
}

/** Cumulative savings series for the last `n` days. */
export function savingsSeries(s: AppState, n = 30, today = dayKey()) {
  const out: { day: string; value: number }[] = [];
  let running = 0;
  const first = addDays(today, -(n - 1));
  // Everything saved before the window starts.
  const before = totalSaved(s, addDays(first, -1));
  running = before;
  for (let i = 0; i < n; i++) {
    const day = addDays(first, i);
    running += savedOnDay(s, day);
    out.push({ day, value: Math.max(0, running) });
  }
  return out;
}

export function currentStreak(s: AppState, h: Habit, today = dayKey()): number {
  const slips = s.slips.filter((x) => x.habitId === h.id && x.date <= today).map((x) => x.date);
  const last = slips.sort().at(-1);
  const from = last ? addDays(last, 1) : h.startDate;
  return Math.max(0, daysBetween(from, today) + 1);
}

export function longestStreak(s: AppState, h: Habit, today = dayKey()): number {
  const slips = [...new Set(s.slips.filter((x) => x.habitId === h.id).map((x) => x.date))].sort();
  let best = 0;
  let from = h.startDate;
  for (const d of slips) {
    best = Math.max(best, daysBetween(from, d));
    from = addDays(d, 1);
  }
  return Math.max(best, daysBetween(from, today) + 1);
}

/** Habit milestones in days — chosen to celebrate early wins, when habit change is fastest. */
export const MILESTONES = [1, 3, 7, 14, 30, 45, 66, 90, 180, 365];

export function nextMilestone(days: number) {
  return MILESTONES.find((m) => m > days) ?? days + 100;
}

/** Count of trigger tags across urges and journal entries. */
export function triggerCounts(s: AppState) {
  const map = new Map<string, number>();
  for (const u of s.urges) for (const t of u.triggers) map.set(t, (map.get(t) ?? 0) + 1);
  for (const j of s.journal) for (const t of j.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** Average of a value by ISO week, oldest first. */
export function weeklyAverage<T>(items: T[], ts: (x: T) => number, val: (x: T) => number, weeks = 8) {
  const now = new Date();
  const out: { label: string; value: number | null }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const inWeek = items.filter((x) => ts(x) > start.getTime() && ts(x) <= end.getTime());
    out.push({
      label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: inWeek.length ? inWeek.reduce((a, x) => a + val(x), 0) / inWeek.length : null,
    });
  }
  return out;
}

export function hourBuckets(s: AppState) {
  const buckets = [
    { label: "Morning", from: 5, to: 12, n: 0 },
    { label: "Afternoon", from: 12, to: 17, n: 0 },
    { label: "Evening", from: 17, to: 21, n: 0 },
    { label: "Late night", from: 21, to: 29, n: 0 },
  ];
  for (const u of s.urges) {
    let h = new Date(u.ts).getHours();
    if (h < 5) h += 24;
    const b = buckets.find((b) => h >= b.from && h < b.to);
    if (b) b.n++;
  }
  return buckets;
}

/** Things the money could become — makes an abstract number concrete. */
export function translateSavings(n: number) {
  const ideas = [
    { cost: 15, text: "a month of a streaming service" },
    { cost: 60, text: "a full tank of gas, twice" },
    { cost: 120, text: "a nice dinner out for two" },
    { cost: 250, text: "a car payment's worth of breathing room" },
    { cost: 500, text: "a starter emergency fund" },
    { cost: 1000, text: "a full emergency fund cushion for a surprise bill" },
    { cost: 2500, text: "a real vacation" },
    { cost: 5000, text: "a serious dent in credit card debt" },
  ];
  return [...ideas].reverse().find((i) => n >= i.cost) ?? null;
}
