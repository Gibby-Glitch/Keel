"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSharing, type InviteResult, type SharedEntry } from "@/lib/sharing";
import { cloudEnabled } from "@/lib/supabase";
import { EntryBody } from "@/components/EntryCard";
import { Button, Chip, Empty, Field, PageHead, Section, cx, inputCls } from "@/components/ui";

const INVITE_MSG: Record<InviteResult, string> = {
  invited: "Invite sent. They'll see it the next time they open Keel.",
  accepted: "You're linked. You can now send each other entries.",
  not_found: "No Keel account uses that email yet. Ask them to create one, then invite them again.",
  self: "That's your own email. Enter your partner's.",
  already_partners: "You're already linked with them.",
  already_invited: "You've already invited them. They need to accept from their Shared page.",
};

const QUICK_REPLIES = ["Proud of you.", "I'm here. Want to talk tonight?", "Thank you for telling me.", "We've got this together."];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function SharedPage() {
  const s = useSharing();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");

  if (!cloudEnabled) {
    return (
      <>
        <PageHead title="Shared" />
        <Empty>Sharing needs accounts. Connect Keel to Supabase (see the README) and each person can sign in and send entries to the other.</Empty>
      </>
    );
  }

  const partner = s.partners[0];
  const incoming = s.partnerships.filter((p) => p.status === "pending" && p.direction === "incoming");
  const outgoing = s.partnerships.filter((p) => p.status === "pending" && p.direction === "outgoing");

  return (
    <>
      <PageHead
        title="Shared"
        lede={
          partner
            ? `Entries you and ${partner.display_name} choose to send each other. Everything else in your journals stays private.`
            : "Link with your partner to send each other journal entries. Each of you keeps a private journal — only what you choose to send is shared."
        }
      />

      {incoming.map((p) => (
        <div key={p.id} className="mb-6 rounded-2xl border border-tide/40 bg-tide-soft p-5 text-tide-deep">
          <p className="font-medium">{p.other.display_name || p.other.email} wants to link journals with you.</p>
          <p className="mt-1 text-[15px]">You'll be able to send each other entries. Neither of you can see the other's journal otherwise.</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => s.respond(p.id, true)}>Accept</Button>
            <Button variant="ghost" onClick={() => s.respond(p.id, false)}>Decline</Button>
          </div>
        </div>
      ))}

      {!partner && <InviteForm pending={outgoing} onCancel={(id) => s.removePartner(id)} invite={s.invite} />}

      {partner && (
        <>
          <div className="mb-6 flex gap-2" role="tablist">
            <TabButton on={tab === "inbox"} onClick={() => setTab("inbox")} count={s.unread}>From {partner.display_name}</TabButton>
            <TabButton
              on={tab === "sent"}
              onClick={() => {
                setTab("sent");
                s.seenReplies();
              }}
              count={s.newReplies}
            >
              Sent by you
            </TabButton>
          </div>

          {tab === "inbox" ? (
            s.inbox.length === 0 ? (
              <Empty>Nothing yet. When {partner.display_name} sends you an entry, it lands here.</Empty>
            ) : (
              <ul className="space-y-5">
                {s.inbox.map((r) => <InboxItem key={r.id} r={r} from={s.nameOf(r.sender)} />)}
              </ul>
            )
          ) : s.sent.length === 0 ? (
            <Empty>
              You haven't sent anything yet. Open your <Link href="/journal" className="font-medium text-tide">journal</Link> and tap
              “Send to {partner.display_name}” on any entry.
            </Empty>
          ) : (
            <ul className="space-y-5">
              {s.sent.map((r) => <SentItem key={r.id} r={r} to={s.nameOf(r.recipient)} />)}
            </ul>
          )}

          <Section title="Partner" className="mt-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px]">
                Linked with <span className="font-medium">{partner.display_name}</span> <span className="text-muted">({partner.email})</span>
              </p>
              <Button
                variant="danger"
                className="!py-1.5 text-sm"
                onClick={() => {
                  const link = s.partnerships.find((p) => p.other.id === partner.id);
                  if (link && confirm(`Unlink from ${partner.display_name}? You'll stop being able to send each other entries. Entries already sent stay where they are.`))
                    s.removePartner(link.id);
                }}
              >
                Unlink
              </Button>
            </div>
          </Section>
        </>
      )}
    </>
  );
}

function TabButton({ on, onClick, count, children }: { on: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cx(
        "flex items-center gap-2 rounded-full border px-4 py-2 text-[15px] transition",
        on ? "border-tide bg-tide text-tide-ink" : "border-line bg-surface hover:border-tide/50",
      )}
    >
      {children}
      {count > 0 && (
        <span className={cx("num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", on ? "bg-tide-ink text-tide" : "bg-brass text-surface")}>
          {count}
        </span>
      )}
    </button>
  );
}

function InviteForm({
  pending,
  onCancel,
  invite,
}: {
  pending: { id: string; other: { email: string; display_name: string } }[];
  onCancel: (id: string) => void;
  invite: (email: string) => Promise<InviteResult>;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Link with your partner">
      <ol className="mb-6 max-w-[60ch] list-decimal space-y-1 pl-5 text-[15px] text-muted">
        <li>Your partner creates their own Keel account on their phone or computer.</li>
        <li>Enter the email they signed up with below.</li>
        <li>They accept the invite from their Shared page.</li>
      </ol>
      <form
        className="flex max-w-lg flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await invite(email);
            setMsg({ ok: r === "invited" || r === "accepted", text: INVITE_MSG[r] });
            if (r === "invited" || r === "accepted") setEmail("");
          } catch {
            setMsg({ ok: false, text: "That didn't go through. Check your connection and try again." });
          }
          setBusy(false);
        }}
      >
        <div className="min-w-[240px] flex-1">
          <Field label="Partner's email">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>Send invite</Button>
      </form>
      {msg && (
        <p role="status" className={cx("mt-4 max-w-lg rounded-xl px-4 py-3 text-[15px]", msg.ok ? "bg-tide-soft text-tide-deep" : "bg-ember-soft text-ember")}>
          {msg.text}
        </p>
      )}
      {pending.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {pending.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[15px]">
              <span>
                Waiting for <span className="font-medium">{p.other.display_name || p.other.email}</span> to accept
              </span>
              <button className="text-sm text-muted hover:text-ember" onClick={() => onCancel(p.id)}>Cancel invite</button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function InboxItem({ r, from }: { r: SharedEntry; from: string }) {
  const { markRead, reply, dismiss } = useSharing();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const unread = !r.read_at;
  const markRef = useRef(markRead);
  markRef.current = markRead;

  // Mark as read once it has been on screen briefly.
  useEffect(() => {
    if (!unread) return;
    const t = window.setTimeout(() => markRef.current(r.id), 1500);
    return () => window.clearTimeout(t);
  }, [unread, r.id]);

  return (
    <li className={cx("rounded-[24px] border bg-surface p-5 sm:p-6", unread ? "border-brass/50" : "border-line")}>
      <p className="mb-3 text-sm text-muted">
        {unread && <span className="mr-2 font-medium text-brass">New</span>}
        {from} sent this {when(r.created_at)}
      </p>
      {r.note && <p className="mb-4 border-l-2 border-tide pl-4 font-serif text-[1.1875rem] italic leading-relaxed">{r.note}</p>}
      <EntryBody e={r.entry} />

      <div className="mt-5 border-t border-line pt-4">
        {r.reply ? (
          <p className="text-[15px]">
            <span className="text-muted">You replied:</span> {r.reply}
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              setBusy(true);
              await reply(r.id, text);
              setBusy(false);
            }}
            className="space-y-3"
          >
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((q) => (
                <Chip key={q} label={q} on={text === q} onClick={() => setText(q)} />
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${from}…`} aria-label={`Reply to ${from}`} />
              <Button type="submit" disabled={busy || !text.trim()}>Reply</Button>
            </div>
          </form>
        )}
        <button className="mt-3 text-sm text-muted hover:text-ember" onClick={() => confirm("Remove this from your inbox?") && dismiss(r.id)}>
          Remove from inbox
        </button>
      </div>
    </li>
  );
}

function SentItem({ r, to }: { r: SharedEntry; to: string }) {
  const { unsend } = useSharing();
  return (
    <li className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
      <p className="mb-3 text-sm text-muted">
        Sent to {to} {when(r.created_at)}. {r.read_at ? `Read ${when(r.read_at)}.` : "Not read yet."}
      </p>
      {r.note && <p className="mb-4 border-l-2 border-tide pl-4 font-serif text-[1.1875rem] italic leading-relaxed">{r.note}</p>}
      <EntryBody e={r.entry} compact />
      {r.reply && (
        <div className="mt-5 rounded-2xl bg-tide-soft px-4 py-3 text-tide-deep">
          <p className="text-sm">{to} replied</p>
          <p className="mt-1 font-serif text-[1.125rem] leading-relaxed">{r.reply}</p>
        </div>
      )}
      <button
        className="mt-4 text-sm text-muted hover:text-ember"
        onClick={() => confirm(`Unsend this? It will disappear from ${to}'s inbox. It stays in your journal.`) && unsend(r.id)}
      >
        Unsend
      </button>
    </li>
  );
}
