"use client";

import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "quiet" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-tide text-tide-ink hover:brightness-110",
    quiet: "bg-tide-soft text-tide-deep hover:brightness-[0.97]",
    ghost: "text-ink hover:bg-tide-soft/60 border border-line",
    danger: "text-ember border border-line hover:bg-ember-soft",
  };
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium transition disabled:opacity-40 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
    />
  );
}

/** Selectable tag. Pressed state is announced to assistive tech. */
export function Chip({
  label,
  on,
  onClick,
  onRemove,
  tone = "tide",
}: {
  label: string;
  on?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  tone?: "tide" | "brass";
}) {
  const active = tone === "brass" ? "bg-brass-soft text-brass border-brass/40" : "bg-tide text-tide-ink border-tide";
  return (
    <span className="inline-flex">
      <button
        type="button"
        aria-pressed={onClick ? !!on : undefined}
        onClick={onClick}
        className={cx(
          "rounded-full border px-3 py-1.5 text-sm transition",
          on ? active : "border-line bg-surface text-ink hover:border-tide/50",
          onRemove && "rounded-r-none pr-2",
          !onClick && "cursor-default",
        )}
      >
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className={cx(
            "rounded-r-full border border-l-0 px-2 text-sm",
            on ? active : "border-line bg-surface text-muted hover:text-ember",
          )}
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

export function PageHead({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[60ch]">
        <h1 className="font-serif text-[2.25rem] leading-[1.1] tracking-[-0.01em] sm:text-[2.75rem]">{title}</h1>
        {lede && <p className="mt-2 text-muted">{lede}</p>}
      </div>
      {action}
    </header>
  );
}

export function Section({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mb-10", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="font-serif text-[1.375rem] leading-tight">{title}</h2>
        {note && <div className="text-sm text-muted">{note}</div>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-tide focus:outline-none";

/** 1–N segmented scale with labels, used for mood and ease. */
export function Scale({
  value,
  onChange,
  options,
  name,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { v: number; label: string }[];
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cx(
            "rounded-xl border px-1 py-2 text-[13px] leading-tight transition",
            value === o.v ? "border-tide bg-tide text-tide-ink" : "border-line bg-surface hover:border-tide/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-muted">{children}</p>;
}
