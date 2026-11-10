export type HabitKind = "drink" | "spend" | "other";

/**
 * How savings are counted for a habit.
 * - "baseline": a routine with a predictable cost (e.g. a nightly six-pack).
 *   Savings = what the routine would have cost since the start date, minus
 *   what was actually spent on slips.
 * - "logged": irregular purchases (Amazon, Instagram shopping). Savings are
 *   only counted when you log a specific item you skipped, so the number is
 *   real money, not an estimate.
 */
export type Tracking = "baseline" | "logged";

export interface Habit {
  id: string;
  name: string;
  kind: HabitKind;
  tracking: Tracking;
  /** Cost of one occurrence, e.g. 14 for a premium six-pack. */
  costPer: number;
  /** How many times a week the old routine happened. */
  timesPerWeek: number;
  /** ISO date (YYYY-MM-DD) the change started. */
  startDate: string;
}

export interface Slip {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  spent: number;
  note?: string;
}

export interface Urge {
  id: string;
  ts: number;
  habitId?: string;
  intensity: number; // 0–10 at start
  endIntensity?: number; // 0–10 after the tool
  triggers: string[];
  halt: string[];
  outcome: "rode-it-out" | "gave-in";
  amountAvoided?: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  ts: number;
  mood: number; // 1–5
  craving: number; // 0–10
  ease: number; // 1–5, "how hard was today"→ higher is easier
  tags: string[];
  prompt?: string;
  body: string;
}

export interface IfThenPlan {
  id: string;
  cue: string;
  response: string;
  habitId?: string;
}

export interface Replacement {
  id: string;
  name: string;
  /** Which moment it replaces, e.g. "Right after work". */
  when: string;
}

export interface ReplacementLog {
  replacementId: string;
  date: string;
}

export interface PauseItem {
  id: string;
  name: string;
  price: number;
  source: string; // Amazon, Instagram, store…
  habitId?: string;
  addedTs: number;
  waitHours: number;
  decision?: "skipped" | "bought";
  decidedTs?: number;
}

export interface SavingsGoal {
  name: string;
  target: number;
}

export interface Settings {
  name: string;
  why: string;
  reminderTime: string; // "HH:MM"
  remindersOn: boolean;
  onboarded: boolean;
}

export interface AppState {
  version: 1;
  settings: Settings;
  habits: Habit[];
  slips: Slip[];
  urges: Urge[];
  journal: JournalEntry[];
  plans: IfThenPlan[];
  replacements: Replacement[];
  replacementLog: ReplacementLog[];
  pause: PauseItem[];
  goal: SavingsGoal;
  /** Commitment chips the person chose ("Alcohol-free", "24-hour rule"…). */
  commitments: string[];
}
