"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey, uid } from "@/lib/calc";
import { COMMITMENT_CHIPS } from "@/lib/content";
import { HabitEditor } from "@/components/Onboarding";
import { Button, Chip, Empty, Field, PageHead, Section, inputCls } from "@/components/ui";

export default function PlanPage() {
  const { state, update } = useStore();
  const [cue, setCue] = useState("");
  const [response, setResponse] = useState("");
  const [planHabit, setPlanHabit] = useState<string | undefined>(undefined);
  const [rName, setRName] = useState("");
  const [rWhen, setRWhen] = useState("");
  const [custom, setCustom] = useState("");

  const chips = [...new Set([...COMMITMENT_CHIPS, ...state.commitments])];

  return (
    <>
      <PageHead title="My plan" lede="Decide now, while you're calm, what you'll do when the moment comes." />

      <Section title="If-then plans" note="Written out by you — that's what makes them work">
        {state.plans.length === 0 ? (
          <Empty>No plans yet. Start with your most common trigger.</Empty>
        ) : (
          <ul className="mb-6 space-y-2">
            {state.plans.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-[15px]">
                  <span className="text-muted">If</span> {p.cue}, <span className="text-muted">then</span>{" "}
                  <span className="font-medium">{p.response}</span>.
                </p>
                <button aria-label="Delete plan" className="p-1 text-muted hover:text-ember" onClick={() => update((s) => { s.plans = s.plans.filter((x) => x.id !== p.id); })}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid gap-3 rounded-2xl border border-dashed border-line p-4">
          <Field label="If…" hint="A specific moment: a place, a time, a feeling, a notification.">
            <input className={inputCls} value={cue} onChange={(e) => setCue(e.target.value)} placeholder="I'm pulling out of the work parking lot" />
          </Field>
          <Field label="Then I will…" hint="One concrete action you can do in under a minute.">
            <input className={inputCls} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="call my sister and take the highway home" />
          </Field>
          {state.habits.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Chip label="Any habit" on={!planHabit} onClick={() => setPlanHabit(undefined)} />
              {state.habits.map((h) => <Chip key={h.id} label={h.name} on={planHabit === h.id} onClick={() => setPlanHabit(h.id)} />)}
            </div>
          )}
          <div>
            <Button
              disabled={!cue.trim() || !response.trim()}
              onClick={() => {
                update((s) => { s.plans.push({ id: uid(), cue: cue.trim(), response: response.trim(), habitId: planHabit }); });
                setCue("");
                setResponse("");
              }}
            >
              Add plan
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Replacement habits" note="The new routine for the old moment">
        <ul className="mb-4 divide-y divide-line">
          {state.replacements.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <span><span className="font-medium">{r.name}</span> <span className="text-muted">— {r.when}</span></span>
              <button aria-label="Delete replacement" className="p-1 text-muted hover:text-ember" onClick={() => update((s) => { s.replacements = s.replacements.filter((x) => x.id !== r.id); })}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="New habit"><input className={inputCls} value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Evening walk" /></Field>
          <Field label="When"><input className={inputCls} value={rWhen} onChange={(e) => setRWhen(e.target.value)} placeholder="Right after work" /></Field>
          <Button
            variant="quiet"
            disabled={!rName.trim()}
            onClick={() => {
              update((s) => { s.replacements.push({ id: uid(), name: rName.trim(), when: rWhen.trim() || "Daily" }); });
              setRName("");
              setRWhen("");
            }}
          >
            Add
          </Button>
        </div>
      </Section>

      <Section title="Savings goal and reason">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Goal"><input className={inputCls} value={state.goal.name} onChange={(e) => update((s) => { s.goal.name = e.target.value; })} /></Field>
          <Field label="Target"><input className={`${inputCls} num`} type="number" min={1} value={state.goal.target} onChange={(e) => update((s) => { s.goal.target = Number(e.target.value) || 0; })} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Why I'm doing this">
            <textarea className={`${inputCls} min-h-24 font-serif text-[17px]`} value={state.settings.why} onChange={(e) => update((s) => { s.settings.why = e.target.value; })} />
          </Field>
        </div>
      </Section>

      <Section title="Commitments">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip
              key={c}
              label={c}
              on={state.commitments.includes(c)}
              tone="brass"
              onClick={() => update((s) => { s.commitments = s.commitments.includes(c) ? s.commitments.filter((x) => x !== c) : [...s.commitments, c]; })}
            />
          ))}
        </div>
        <form
          className="mt-3 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = custom.trim();
            if (!v) return;
            update((s) => { if (!s.commitments.includes(v)) s.commitments.push(v); });
            setCustom("");
          }}
        >
          <input className={inputCls} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own commitment" aria-label="New commitment" />
          <Button variant="quiet" type="submit">Add</Button>
        </form>
      </Section>

      <Section title="Habits I'm breaking">
        <div className="space-y-4">
          {state.habits.map((h) => (
            <HabitEditor
              key={h.id}
              h={h}
              onChange={(v) => update((s) => { const x = s.habits.find((y) => y.id === h.id); if (x) Object.assign(x, v); })}
              onRemove={() => confirm(`Remove “${h.name}” and its history?`) && update((s) => {
                s.habits = s.habits.filter((y) => y.id !== h.id);
                s.slips = s.slips.filter((y) => y.habitId !== h.id);
              })}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => update((s) => { s.habits.push({ id: uid(), name: "New habit", kind: "other", tracking: "baseline", costPer: 10, timesPerWeek: 3, startDate: dayKey() }); })}
        >
          Add a habit
        </Button>
      </Section>
    </>
  );
}
