"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { money, uid } from "@/lib/calc";
import type { PauseItem } from "@/lib/types";
import { Button, Chip, Empty, Field, PageHead, Section, inputCls } from "@/components/ui";

const QUESTIONS = [
  "Would I buy this at full price if I'd never seen the ad?",
  "Do I already own something that does the job?",
  "Where will it live, and will I use it this month?",
  "How many hours of work is this?",
];

export default function PausePage() {
  const { state, update } = useStore();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [source, setSource] = useState("Amazon");
  const [wait, setWait] = useState(48);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const spendHabit = state.habits.find((h) => h.kind === "spend");
  const waiting = state.pause.filter((p) => !p.decision).sort((a, b) => a.addedTs + a.waitHours * 3.6e6 - (b.addedTs + b.waitHours * 3.6e6));
  const decided = state.pause.filter((p) => p.decision).sort((a, b) => (b.decidedTs ?? 0) - (a.decidedTs ?? 0));
  const skippedTotal = decided.filter((p) => p.decision === "skipped").reduce((a, p) => a + p.price, 0);
  const skipRate = decided.length ? decided.filter((p) => p.decision === "skipped").length / decided.length : 0;

  const add = () => {
    if (!name.trim() || !price) return;
    update((s) => {
      s.pause.push({ id: uid(), name: name.trim(), price: Number(price), source, habitId: spendHabit?.id, addedTs: Date.now(), waitHours: wait });
    });
    setName("");
    setPrice("");
  };
  const decide = (id: string, decision: PauseItem["decision"]) =>
    update((s) => {
      const p = s.pause.find((x) => x.id === id);
      if (p) {
        p.decision = decision;
        p.decidedTs = Date.now();
      }
    });

  return (
    <>
      <PageHead
        title="Pause list"
        lede="Want it? Put it here instead of in the cart. Decide when the timer runs out and the ad has worn off."
      />

      <section className="mb-12 rounded-[28px] border border-line bg-surface p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="What is it?">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="The jacket from that Instagram ad" />
          </Field>
          <Field label="Price">
            <input className={`${inputCls} num`} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">From</span>
          {["Amazon", "Instagram", "TikTok", "Store", "Other"].map((s) => (
            <Chip key={s} label={s} on={source === s} onClick={() => setSource(s)} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Wait</span>
          {[24, 48, 72].map((h) => (
            <Chip key={h} label={`${h} hours`} on={wait === h} onClick={() => setWait(h)} />
          ))}
        </div>
        <Button className="mt-6" onClick={add} disabled={!name.trim() || !price}>Pause it</Button>
      </section>

      <Section title="Waiting" note={waiting.length ? `${waiting.length} on hold` : undefined}>
        {waiting.length === 0 ? (
          <Empty>Nothing on hold. Next time you're about to tap Buy, add it here first.</Empty>
        ) : (
          <ul className="space-y-3">
            {waiting.map((p) => {
              const due = p.addedTs + p.waitHours * 3.6e6;
              const ready = now >= due;
              const hrs = Math.ceil((due - now) / 3.6e6);
              const elapsed = Math.min(1, (now - p.addedTs) / (p.waitHours * 3.6e6));
              return (
                <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="num font-serif text-[1.375rem] text-brass">{money(p.price)}</p>
                  </div>
                  <p className="text-sm text-muted">{p.source}, {ready ? "ready to decide" : `${hrs} ${hrs === 1 ? "hour" : "hours"} left`}</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div className="h-full bg-tide" style={{ width: `${elapsed * 100}%` }} />
                  </div>
                  {ready && (
                    <div className="mt-4">
                      <ul className="mb-4 list-disc space-y-1 pl-5 text-[15px] text-muted">
                        {QUESTIONS.map((q) => <li key={q}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="quiet" className="!py-1.5 text-sm" onClick={() => decide(p.id, "skipped")}>Skip it, keep {money(p.price)}</Button>
                    {ready && <Button variant="ghost" className="!py-1.5 text-sm" onClick={() => decide(p.id, "bought")}>I still want it</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {decided.length > 0 && (
        <Section title="Decided" note={<span className="num">{Math.round(skipRate * 100)}% skipped, <span className="text-brass">{money(skippedTotal)}</span> kept</span>}>
          <ul className="divide-y divide-line">
            {decided.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className={p.decision === "bought" ? "text-muted" : ""}>{p.name}</span>
                <span className="num shrink-0 text-sm">
                  {p.decision === "skipped" ? <span className="text-brass">+{money(p.price)}</span> : <span className="text-muted">Bought</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
