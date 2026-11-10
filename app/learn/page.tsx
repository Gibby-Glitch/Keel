"use client";

import { APPS_LANDSCAPE, SAFETY, SCIENCE } from "@/lib/content";
import { PageHead, Section } from "@/components/ui";

export default function LearnPage() {
  return (
    <>
      <PageHead
        title="The science behind Keel"
        lede="Every tool here maps to a method with research behind it. Here's what each one is, and where it shows up in the app."
      />

      <div className="space-y-10">
        {SCIENCE.map((c) => (
          <article key={c.id} id={c.id} className="grid gap-3 border-t border-line pt-6 md:grid-cols-[1fr_260px] md:gap-10">
            <div>
              <h2 className="font-serif text-[1.5rem] leading-tight">{c.title}</h2>
              <p className="mt-3 max-w-[62ch] leading-[1.7]">{c.summary}</p>
              <p className="mt-3 text-sm text-muted">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-tide">{c.source}</a>
                ) : (
                  c.source
                )}
              </p>
            </div>
            <aside className="self-start rounded-2xl bg-tide-soft px-4 py-3 text-[15px] text-tide-deep">
              <p className="mb-1 font-medium">In Keel</p>
              {c.inKeel}
            </aside>
          </article>
        ))}
      </div>

      <Section title="How Keel compares" className="mt-16">
        <p className="mb-4 max-w-[62ch] text-muted">
          Sobriety apps track drinking. Pause-before-you-buy apps track spending. Keel puts both in one private journal, because
          for many people the store run and the shopping cart are the same escape.
        </p>
        <ul className="divide-y divide-line">
          {APPS_LANDSCAPE.map((a) => (
            <li key={a.name} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]">
              <span className="font-medium">{a.name}</span>
              <span className="text-muted">{a.focus}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Getting more help">
        <div className="max-w-[62ch] space-y-3 leading-[1.7]">
          <p>{SAFETY.withdrawal}</p>
          <p>
            {SAFETY.samhsa.label}: <a className="font-medium text-tide" href={`tel:${SAFETY.samhsa.phone}`}>{SAFETY.samhsa.phone}</a> — {SAFETY.samhsa.note.toLowerCase()}.
          </p>
          <p>
            {SAFETY.crisis.label}: <a className="font-medium text-tide" href="tel:988">988</a> — {SAFETY.crisis.note.toLowerCase()}.
          </p>
          <p>
            Check your drinking pattern with <a className="font-medium text-tide" href={SAFETY.rethinking.url} target="_blank" rel="noreferrer">{SAFETY.rethinking.label}</a>, a free tool from the National Institutes of Health.
          </p>
          <p className="text-sm text-muted">Keel is a self-help journal, not medical treatment or financial advice.</p>
        </div>
      </Section>
    </>
  );
}
