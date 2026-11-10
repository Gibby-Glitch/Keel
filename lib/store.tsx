"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "./types";
import { addDays, dayKey, uid } from "./calc";
import { useAuth } from "./auth";
import { cloudEnabled, supabase } from "./supabase";

/** Data saved before accounts existed (or in single-person mode). */
const LEGACY_KEY = "keel:v1";
/** Per-person offline cache, so two people can share one device safely. */
const cacheKey = (userId: string) => `keel:v1:${userId}`;

export const emptyState = (): AppState => ({
  version: 1,
  settings: { name: "", why: "", reminderTime: "20:30", remindersOn: false, onboarded: false },
  habits: [],
  slips: [],
  urges: [],
  journal: [],
  plans: [],
  replacements: [],
  replacementLog: [],
  pause: [],
  goal: { name: "Emergency fund", target: 1000 },
  commitments: [],
});

const hydrate = (raw: unknown): AppState => ({ ...emptyState(), ...(raw as Partial<AppState>) });

type Updater = (draft: AppState) => AppState | void;
export type SyncStatus = "local" | "saved" | "saving" | "offline";

interface Ctx {
  state: AppState;
  ready: boolean;
  sync: SyncStatus;
  update: (fn: Updater) => void;
  replace: (s: AppState) => void;
  /** Journal data found on this device from before signing in, waiting to be claimed. */
  legacy: AppState | null;
  claimLegacy: () => void;
  dismissLegacy: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

function readLocal(key: string): AppState | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? hydrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function writeLocal(key: string, s: AppState) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncStatus>(cloudEnabled ? "saved" : "local");
  const [legacy, setLegacy] = useState<AppState | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Load: on-device in single-person mode, from the account in cloud mode.
  useEffect(() => {
    dirty.current = false;
    setReady(false);
    if (!cloudEnabled) {
      setState(readLocal(LEGACY_KEY) ?? emptyState());
      setReady(true);
      return;
    }
    if (!userId || !supabase) {
      setState(emptyState());
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = readLocal(cacheKey(userId));
      const { data, error } = await supabase.from("user_state").select("data").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setState(cached ?? emptyState());
        setSync("offline");
      } else if (data) {
        const s = hydrate(data.data);
        setState(s);
        writeLocal(cacheKey(userId), s);
        setSync("saved");
      } else {
        // New account. Offer anything this device recorded before accounts existed.
        setState(cached ?? emptyState());
        const old = readLocal(LEGACY_KEY);
        if (old && (old.habits.length || old.journal.length)) setLegacy(old);
        setSync("saved");
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save: debounced write to the account, with an offline cache.
  useEffect(() => {
    if (!ready || !dirty.current) return;
    if (!cloudEnabled) {
      writeLocal(LEGACY_KEY, state);
      return;
    }
    if (!userId || !supabase) return;
    writeLocal(cacheKey(userId), state);
    setSync("saving");
    window.clearTimeout(timer.current);
    const client = supabase;
    timer.current = window.setTimeout(async () => {
      const { error } = await client
        .from("user_state")
        .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
      setSync(error ? "offline" : "saved");
    }, 700);
  }, [state, ready, userId]);

  // Retry a failed save when the connection comes back.
  useEffect(() => {
    const retry = () => {
      if (sync === "offline") setState((s) => ({ ...s }));
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [sync]);

  const update = useCallback((fn: Updater) => {
    dirty.current = true;
    setState((prev) => {
      const draft = structuredClone(prev);
      return fn(draft) ?? draft;
    });
  }, []);

  const replace = useCallback((s: AppState) => {
    dirty.current = true;
    setState(s);
  }, []);

  const claimLegacy = useCallback(() => {
    if (!legacy) return;
    replace(legacy);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    setLegacy(null);
  }, [legacy, replace]);

  const dismissLegacy = useCallback(() => setLegacy(null), []);

  const value = useMemo(
    () => ({ state, ready, sync, update, replace, legacy, claimLegacy, dismissLegacy }),
    [state, ready, sync, update, replace, legacy, claimLegacy, dismissLegacy],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

/** Six weeks of realistic history so every screen can be explored. */
export function sampleState(): AppState {
  const today = dayKey();
  const start = addDays(today, -41);
  const s = emptyState();
  s.settings = {
    name: "",
    why: "I want to wake up clear, be present in the evenings, and stop watching my paycheck disappear $20 at a time.",
    reminderTime: "20:30",
    remindersOn: false,
    onboarded: true,
  };
  const beer = { id: uid(), name: "Evening beer or wine run", kind: "drink" as const, tracking: "baseline" as const, costPer: 16, timesPerWeek: 6, startDate: start };
  const amazon = { id: uid(), name: "Amazon & Instagram impulse buys", kind: "spend" as const, tracking: "logged" as const, costPer: 35, timesPerWeek: 3, startDate: start };
  s.habits = [beer, amazon];
  s.goal = { name: "Emergency fund", target: 1500 };
  s.commitments = ["Alcohol-free", "No store runs after 6pm", "24-hour rule on purchases", "Emergency fund"];
  s.slips = [
    { id: uid(), habitId: beer.id, date: addDays(today, -33), spent: 15, note: "Friday after a brutal week." },
    { id: uid(), habitId: beer.id, date: addDays(today, -19), spent: 18, note: "Game night at Mike's." },
  ];
  s.plans = [
    { id: uid(), cue: "I'm driving home and reach the turn for the store", response: "I'll keep going straight and put on my podcast", habitId: beer.id },
    { id: uid(), cue: "I open Instagram and see something I want", response: "I'll screenshot it and add it to the Pause list instead of tapping Buy", habitId: amazon.id },
    { id: uid(), cue: "It's 9pm and I feel restless", response: "I'll make tea and do a 10-minute urge ride-out", habitId: beer.id },
  ];
  s.replacements = [
    { id: uid(), name: "20-minute walk", when: "Right after work" },
    { id: uid(), name: "Sparkling water or NA beer", when: "Evening wind-down" },
    { id: uid(), name: "Move $5 to savings", when: "When I skip a purchase" },
  ];
  const triggerSets = [["After work", "Tired"], ["Stress"], ["Boredom", "Scrolling Instagram"], ["Driving past the store"], ["Lonely"], ["Weekend", "Watching a game"], ["Anxious"]];
  for (let i = 41; i >= 0; i--) {
    const d = addDays(today, -i);
    const progress = (41 - i) / 41;
    for (const r of s.replacements)
      if (Math.random() < 0.45 + progress * 0.4) s.replacementLog.push({ replacementId: r.id, date: d });
    if (Math.random() < 0.75 - progress * 0.4) {
      const base = new Date(`${d}T00:00:00`);
      base.setHours(17 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60));
      const intensity = Math.round(8 - progress * 4 + (Math.random() * 2 - 1));
      const isSpend = Math.random() < 0.35;
      s.urges.push({
        id: uid(),
        ts: base.getTime(),
        habitId: isSpend ? amazon.id : beer.id,
        intensity: Math.max(2, Math.min(10, intensity)),
        endIntensity: Math.max(1, Math.round(intensity * 0.45)),
        triggers: triggerSets[Math.floor(Math.random() * triggerSets.length)],
        halt: Math.random() < 0.5 ? ["Tired"] : [],
        outcome: "rode-it-out",
        amountAvoided: isSpend ? [22, 29, 38, 46, 64][Math.floor(Math.random() * 5)] : undefined,
      });
    }
    if (Math.random() < 0.6) {
      const ts = new Date(`${d}T21:15:00`).getTime();
      s.journal.push({
        id: uid(),
        ts,
        mood: Math.max(1, Math.min(5, Math.round(2.4 + progress * 2 + (Math.random() - 0.5)))),
        craving: Math.max(0, Math.min(10, Math.round(7 - progress * 5 + (Math.random() * 2 - 1)))),
        ease: Math.max(1, Math.min(5, Math.round(1.6 + progress * 3 + (Math.random() - 0.5)))),
        tags: triggerSets[Math.floor(Math.random() * triggerSets.length)],
        body:
          progress < 0.3
            ? "Hard evening. Took the long way home so I wouldn't pass the store. Craving peaked around 8 and was gone by 9."
            : progress < 0.7
              ? "Noticed the urge on the drive but it was quieter. Walked instead. Felt good to check the savings number."
              : "Barely thought about it tonight. Slept well last night and it shows. Moved the money to savings.",
      });
    }
  }
  s.pause = [
    { id: uid(), name: "Wireless earbuds (Instagram ad)", price: 89, source: "Instagram", habitId: amazon.id, addedTs: Date.now() - 6 * 86400000, waitHours: 72, decision: "skipped", decidedTs: Date.now() - 3 * 86400000 },
    { id: uid(), name: "Kitchen gadget set", price: 42, source: "Amazon", habitId: amazon.id, addedTs: Date.now() - 12 * 86400000, waitHours: 48, decision: "skipped", decidedTs: Date.now() - 10 * 86400000 },
    { id: uid(), name: "Running shoes", price: 120, source: "Store", habitId: amazon.id, addedTs: Date.now() - 20 * 86400000, waitHours: 72, decision: "bought", decidedTs: Date.now() - 17 * 86400000 },
    { id: uid(), name: "Graphic hoodie", price: 58, source: "Instagram", habitId: amazon.id, addedTs: Date.now() - 5 * 3600000, waitHours: 24 },
  ];
  return s;
}
