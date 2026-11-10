"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Single-series line/area chart with a crosshair tooltip.
 * One series per chart, by design — two measures get two charts, never two axes.
 */
export function LineChart({
  data,
  format = (v) => String(Math.round(v * 10) / 10),
  yMin,
  yMax,
  height = 180,
  area = false,
  label,
}: {
  data: { label: string; value: number | null }[];
  format?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  height?: number;
  area?: boolean;
  label: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  // Draw at the real pixel width so axis text stays a readable size at any width.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const lo = yMin ?? Math.min(0, ...vals);
  const hi = yMax ?? Math.max(1, ...vals) * 1.08;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);

  const pts = data.map((d, i) => (d.value === null ? null : [x(i), y(d.value)] as const));
  let path = "";
  let started = false;
  pts.forEach((p) => {
    if (!p) {
      started = false;
      return;
    }
    path += `${started ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    started = true;
  });
  const valid = pts.filter(Boolean) as (readonly [number, number])[];
  const areaPath = area && valid.length > 1 ? `${path}L${valid.at(-1)![0]},${H - pad.b}L${valid[0][0]},${H - pad.b}Z` : "";
  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const hv = hover !== null ? data[hover] : null;

  return (
    <figure ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block w-full touch-none overflow-visible"
        role="img"
        aria-label={label}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--tide)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--tide)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="var(--line)" strokeDasharray="2 4" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line)" />
        {areaPath && <path d={areaPath} fill={`url(#g${id})`} />}
        <path d={path} fill="none" stroke="var(--tide)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {valid.length > 0 && (
          <circle cx={valid.at(-1)![0]} cy={valid.at(-1)![1]} r={4} fill="var(--tide)" stroke="var(--surface)" strokeWidth={2} />
        )}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize={12} fill="var(--muted)" textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>
            {data[i]?.label}
          </text>
        ))}
        {hover !== null && hv && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeOpacity={0.5} />
            {hv.value !== null && <circle cx={x(hover)} cy={y(hv.value)} r={5} fill="var(--tide)" stroke="var(--surface)" strokeWidth={2} />}
          </>
        )}
      </svg>
      {hover !== null && hv && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1 text-[13px] shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <span className="text-muted">{hv.label}</span> <span className="num font-semibold">{hv.value === null ? "No data" : format(hv.value)}</span>
        </div>
      )}
    </figure>
  );
}

/** Horizontal bars, labels on the left, values direct-labeled at the end. */
export function Bars({ data, max, format = String }: { data: { label: string; value: number }[]; max?: number; format?: (v: number) => string }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(110px,170px)_1fr] items-center gap-3 text-[15px]" title={`${d.label}: ${format(d.value)}`}>
          <span className="truncate text-muted">{d.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 rounded-r-[4px] bg-tide" style={{ width: `${Math.max(2, (d.value / m) * 100)}%` }} />
            <span className="num shrink-0 text-sm">{format(d.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
