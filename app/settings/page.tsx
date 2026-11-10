"use client";

import { useEffect, useRef, useState } from "react";
import { emptyState, sampleState, useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import Link from "next/link";
import type { AppState } from "@/lib/types";
import { buildIcs } from "@/components/Reminders";
import { Button, Chip, Field, PageHead, Section, inputCls } from "@/components/ui";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Theme = "system" | "light" | "dark";

export default function SettingsPage() {
  const { state, update, replace } = useStore();
  const auth = useAuth();
  const [displayName, setDisplayName] = useState("");
  useEffect(() => setDisplayName(auth.profile?.display_name ?? ""), [auth.profile?.display_name]);
  const [perm, setPerm] = useState<string>("default");
  const [theme, setTheme] = useState<Theme>("system");
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    try {
      setTheme((localStorage.getItem("keel:theme") as Theme) || "system");
    } catch {}
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("keel:theme", t);
    } catch {}
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };

  const enableReminders = async () => {
    if (typeof Notification === "undefined") {
      setMsg("This browser doesn't support notifications. Use the calendar reminder below instead.");
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    update((s) => { s.settings.remindersOn = p === "granted"; });
    if (p !== "granted") setMsg("Notifications are blocked. Allow them in your browser's site settings, or use the calendar reminder.");
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (data.version !== 1 || !Array.isArray(data.habits)) throw new Error();
      replace({ ...emptyState(), ...data });
      setMsg("Imported.");
    } catch {
      setMsg("That file isn't a Keel export. Choose a file named keel-backup-….json.");
    }
  };

  return (
    <>
      <PageHead title="Settings" />

      <Section title={cloudEnabled ? "Account" : "You"}>
        {cloudEnabled && auth.profile ? (
          <div className="max-w-md space-y-4">
            <p className="text-[15px] text-muted">
              Signed in as <span className="font-medium text-ink">{auth.profile.email}</span>. Your journal is private to this account.
              Share individual entries from the <Link href="/shared" className="font-medium text-tide hover:underline">Shared</Link> page or your journal.
            </p>
            <form
              className="flex items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await auth.setDisplayName(displayName);
                update((s) => { s.settings.name = displayName.trim(); });
                setMsg("Name saved.");
              }}
            >
              <div className="flex-1">
                <Field label="Your name" hint="Used in greetings and shown to your partner.">
                  <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </Field>
              </div>
              <Button variant="quiet" type="submit" className="mb-[26px]">Save</Button>
            </form>
            <Button variant="ghost" onClick={() => auth.signOut()}>Sign out</Button>
          </div>
        ) : (
          <div className="max-w-sm">
            <Field label="Name for greetings" hint="Optional.">
              <input className={inputCls} value={state.settings.name} onChange={(e) => update((s) => { s.settings.name = e.target.value; })} />
            </Field>
          </div>
        )}
        <p className="mb-2 mt-5 text-sm font-medium">Appearance</p>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <Chip key={t} label={t === "system" ? "Match device" : t[0].toUpperCase() + t.slice(1)} on={theme === t} onClick={() => applyTheme(t)} />
          ))}
        </div>
      </Section>

      <Section title="Reminders">
        <div className="max-w-[60ch] space-y-5">
          <Field label="Evening check-in time">
            <input
              type="time"
              className={`${inputCls} num max-w-[160px]`}
              value={state.settings.reminderTime}
              onChange={(e) => update((s) => { s.settings.reminderTime = e.target.value; })}
            />
          </Field>
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-sm text-muted">Shown at your check-in time while Keel is open or installed to your home screen.</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {state.settings.remindersOn && perm === "granted" ? (
                <Button variant="ghost" onClick={() => update((s) => { s.settings.remindersOn = false; })}>Turn off notifications</Button>
              ) : (
                <Button variant="quiet" onClick={enableReminders}>Turn on notifications</Button>
              )}
            </div>
          </div>
          <div>
            <p className="font-medium">Calendar reminders</p>
            <p className="text-sm text-muted">
              Works even when Keel is closed. Adds a daily check-in at your chosen time and a weekday 4:45pm “plan the drive home” alert to
              Apple, Google or Outlook calendar.
            </p>
            <Button variant="quiet" className="mt-2" onClick={() => download("keel-reminders.ics", buildIcs(state.settings.reminderTime, state.settings.why), "text/calendar")}>
              Download calendar reminders
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Your data" note={cloudEnabled ? "Saved to your account" : "Stored only in this browser"}>
        <p className="mb-4 max-w-[60ch] text-muted">
          {cloudEnabled
            ? "Your data is saved to your private account and loads on any device you sign in on. Export a backup any time to keep your own copy."
            : "Keel has no account and no server. Export a backup to move to another device or keep a copy safe — clearing browser data erases your history."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={() => download(`keel-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json")}>
            Export backup
          </Button>
          <Button variant="ghost" onClick={() => file.current?.click()}>Import backup</Button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <Button variant="ghost" onClick={() => confirm("Replace your data with sample data?") && replace(sampleState())}>Load sample data</Button>
          <Button variant="danger" onClick={() => confirm(cloudEnabled ? "Erase your journal, habits and savings history from your account? Entries you already sent stay with your partner. This can't be undone." : "Erase everything in Keel on this device? This can't be undone.") && replace(emptyState())}>
            Erase everything
          </Button>
        </div>
      </Section>

      {msg && <p role="status" className="rounded-xl bg-tide-soft px-4 py-3 text-tide-deep">{msg}</p>}
    </>
  );
}
