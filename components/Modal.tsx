"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(560px,calc(100vw-24px))] rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-[#0b1416]/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-[1.625rem] leading-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-tide-soft">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
