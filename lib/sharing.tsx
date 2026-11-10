"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth, type Profile } from "./auth";
import { supabase } from "./supabase";
import type { JournalEntry } from "./types";

export interface Partnership {
  id: string;
  status: "pending" | "accepted";
  /** "incoming" = they invited you. */
  direction: "incoming" | "outgoing";
  other: Profile;
}

export interface SharedEntry {
  id: string;
  sender: string;
  recipient: string;
  entry: JournalEntry;
  note: string;
  reply: string | null;
  replied_at: string | null;
  read_at: string | null;
  created_at: string;
}

export type InviteResult = "invited" | "accepted" | "not_found" | "self" | "already_partners" | "already_invited";

interface SharingCtx {
  enabled: boolean;
  partnerships: Partnership[];
  partners: Profile[];
  inbox: SharedEntry[];
  sent: SharedEntry[];
  unread: number;
  /** New replies to entries you sent that you haven't looked at yet. */
  newReplies: number;
  nameOf: (id: string) => string;
  refresh: () => Promise<void>;
  invite: (email: string) => Promise<InviteResult>;
  respond: (id: string, accept: boolean) => Promise<void>;
  removePartner: (id: string) => Promise<void>;
  send: (recipient: string, entry: JournalEntry, note: string) => Promise<string | null>;
  markRead: (id: string) => Promise<void>;
  reply: (id: string, text: string) => Promise<void>;
  unsend: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  seenReplies: () => void;
}

const Ctx = createContext<SharingCtx | null>(null);
const SEEN_KEY = "keel:replies-seen";

export function SharingProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [rows, setRows] = useState<SharedEntry[]>([]);
  const [seenAt, setSeenAt] = useState<string>("");

  useEffect(() => {
    try {
      setSeenAt(localStorage.getItem(`${SEEN_KEY}:${userId}`) ?? "");
    } catch {}
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setPartnerships([]);
      setRows([]);
      return;
    }
    const [{ data: links }, { data: shared }] = await Promise.all([
      supabase.from("partnerships").select("id, requester, addressee, status"),
      supabase.from("shared_entries").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const otherIds = (links ?? []).map((l) => (l.requester === userId ? l.addressee : l.requester));
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("id, email, display_name").in("id", otherIds)
      : { data: [] as Profile[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    setPartnerships(
      (links ?? [])
        .map((l) => {
          const otherId = l.requester === userId ? l.addressee : l.requester;
          const other = byId.get(otherId);
          return other
            ? ({ id: l.id, status: l.status, direction: l.requester === userId ? "outgoing" : "incoming", other } as Partnership)
            : null;
        })
        .filter((x): x is Partnership => x !== null),
    );
    setRows((shared ?? []) as SharedEntry[]);
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!supabase || !userId) return;
    const client = supabase;
    const channel = client
      .channel(`shared-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_entries", filter: `recipient=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_entries", filter: `sender=eq.${userId}` }, refresh)
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const poll = window.setInterval(refresh, 90_000);
    return () => {
      client.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(poll);
    };
  }, [userId, refresh]);

  const partners = useMemo(() => partnerships.filter((p) => p.status === "accepted").map((p) => p.other), [partnerships]);
  const inbox = useMemo(() => rows.filter((r) => r.recipient === userId), [rows, userId]);
  const sent = useMemo(() => rows.filter((r) => r.sender === userId), [rows, userId]);
  const unread = inbox.filter((r) => !r.read_at).length;
  const newReplies = sent.filter((r) => r.replied_at && r.replied_at > seenAt).length;

  const nameOf = useCallback(
    (id: string) => partnerships.find((p) => p.other.id === id)?.other.display_name || "Your partner",
    [partnerships],
  );

  const rpc = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      if (!supabase) return null;
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh],
  );

  const value: SharingCtx = {
    enabled: Boolean(supabase && userId),
    partnerships,
    partners,
    inbox,
    sent,
    unread,
    newReplies,
    nameOf,
    refresh,
    invite: async (email) => (await rpc("invite_partner", { p_email: email })) as InviteResult,
    respond: async (id, accept) => void (await rpc("respond_partner", { p_id: id, p_accept: accept })),
    removePartner: async (id) => void (await rpc("remove_partner", { p_id: id })),
    send: async (recipient, entry, note) => {
      if (!supabase || !userId) return "Not signed in.";
      const { error } = await supabase.from("shared_entries").insert({ sender: userId, recipient, entry, note: note.trim() });
      if (error) return "That didn't send. Check your connection and that you're still linked as partners.";
      await refresh();
      return null;
    },
    markRead: async (id) => void (await rpc("mark_shared_read", { p_id: id })),
    reply: async (id, text) => void (await rpc("reply_shared", { p_id: id, p_reply: text })),
    unsend: async (id) => {
      if (!supabase) return;
      await supabase.from("shared_entries").delete().eq("id", id);
      await refresh();
    },
    dismiss: async (id) => void (await rpc("dismiss_shared", { p_id: id })),
    seenReplies: () => {
      const now = new Date().toISOString();
      setSeenAt(now);
      try {
        localStorage.setItem(`${SEEN_KEY}:${userId}`, now);
      } catch {}
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSharing() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSharing outside provider");
  return c;
}

/** Has this journal entry already been sent to this person? */
export function sentTo(sent: SharedEntry[], entryId: string) {
  return sent.filter((s) => s.entry?.id === entryId).map((s) => s.recipient);
}
