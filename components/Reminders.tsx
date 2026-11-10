"use client";

import { useEffect } from "react";
import { dayKey } from "@/lib/calc";
import { useStore } from "@/lib/store";

const FIRED = "keel:reminder-fired";

/**
 * Fires the evening check-in as a system notification while Keel is open in a
 * tab or installed as an app. For reminders when the app is closed, Settings
 * offers a calendar file with a daily repeating alarm.
 */
export function Reminders() {
  const { state } = useStore();
  const { remindersOn, reminderTime } = state.settings;

  useEffect(() => {
    if (!remindersOn || typeof Notification === "undefined") return;
    const tick = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const [h, m] = reminderTime.split(":").map(Number);
      const due = new Date(now);
      due.setHours(h, m, 0, 0);
      let last: string | null = null;
      try {
        last = localStorage.getItem(FIRED);
      } catch {}
      if (now >= due && last !== dayKey()) {
        new Notification("Keel — evening check-in", {
          body: "How did today go? Two minutes to log it keeps the streak honest.",
          icon: "/icon.svg",
          tag: "keel-checkin",
        });
        try {
          localStorage.setItem(FIRED, dayKey());
        } catch {}
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [remindersOn, reminderTime]);

  return null;
}

export function buildIcs(time: string, why: string) {
  const [h, m] = time.split(":");
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const esc = (s: string) => s.replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const desc = esc(`Open Keel and log today. ${why ? "Remember: " + why : ""}`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keel//Habit Journal//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:keel-checkin-${ymd}@keel.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${h}${m}00`,
    "DURATION:PT10M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:Keel check-in",
    `DESCRIPTION:${desc}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Keel check-in",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "BEGIN:VEVENT",
    `UID:keel-danger-hour-${ymd}@keel.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T164500`,
    "DURATION:PT5M",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    "SUMMARY:Heading home — plan the drive",
    "DESCRIPTION:Take the route that skips the store. Your if-then plans are in Keel.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Plan the drive home",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
