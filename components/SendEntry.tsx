"use client";

import Link from "next/link";
import { useState } from "react";
import { useSharing } from "@/lib/sharing";
import type { JournalEntry } from "@/lib/types";
import { Modal } from "./Modal";
import { EntryBody } from "./EntryCard";
import { Button, Chip, Field, inputCls } from "./ui";

export function SendEntryModal({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const { partners } = useSharing();
  const [to, setTo] = useState<string | undefined>(partners[0]?.id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const { send } = useSharing();
  const recipient = partners.find((p) => p.id === (to ?? partners[0]?.id));

  return (
    <Modal open={!!entry} onClose={onClose} title={done ? `Sent to ${recipient?.display_name}` : "Send this entry"}>
      {!partners.length ? (
        <div className="space-y-4">
          <p className="text-muted">Link with your partner first. Once you're both connected, you can send each other entries.</p>
          <Link href="/shared" onClick={onClose}>
            <Button>Invite your partner</Button>
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <p className="text-muted">
            {recipient?.display_name} will see it in their Shared inbox. You'll see it there too, along with any reply.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        entry && (
          <div className="space-y-5">
            <p className="text-[15px] text-muted">
              They'll get a copy of this one entry. The rest of your journal, your savings and your habits stay private.
            </p>
            <div className="max-h-56 overflow-auto rounded-2xl border border-line p-4">
              <EntryBody e={entry} compact />
            </div>
            {partners.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {partners.map((p) => (
                  <Chip key={p.id} label={p.display_name || p.email} on={recipient?.id === p.id} onClick={() => setTo(p.id)} />
                ))}
              </div>
            )}
            <Field label={`A note for ${recipient?.display_name || "them"}`} hint="Optional.">
              <textarea className={`${inputCls} min-h-20`} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Wanted you to see this. Tonight was hard but I made it." />
            </Field>
            {error && <p role="alert" className="rounded-xl bg-ember-soft px-4 py-3 text-ember">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                disabled={busy || !recipient}
                onClick={async () => {
                  if (!recipient) return;
                  setBusy(true);
                  const err = await send(recipient.id, entry, note);
                  setBusy(false);
                  if (err) setError(err);
                  else setDone(true);
                }}
              >
                {busy ? "Sending…" : `Send to ${recipient?.display_name || "partner"}`}
              </Button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
