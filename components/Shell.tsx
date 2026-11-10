"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Heart, Hourglass, LineChart, Menu, NotebookPen, Settings, Sun, Waves } from "lucide-react";
import { useStore, type SyncStatus } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useSharing } from "@/lib/sharing";
import { cloudEnabled } from "@/lib/supabase";
import { Onboarding } from "./Onboarding";
import { Reminders } from "./Reminders";
import { AuthScreen, NewPasswordScreen } from "./AuthScreen";
import { cx } from "./ui";

const ALL_NAV = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/urge", label: "Ride out an urge", short: "Urge", icon: Waves },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/shared", label: "Shared", icon: Heart, cloud: true },
  { href: "/pause", label: "Pause list", icon: Hourglass },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/plan", label: "My plan", icon: Compass },
  { href: "/learn", label: "The science", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const NAV = ALL_NAV.filter((n) => !n.cloud || cloudEnabled);
const MOBILE = cloudEnabled ? ["/", "/journal", "/urge", "/shared", "/more"] : ["/", "/journal", "/urge", "/insights", "/more"];
export const MORE_LINKS = NAV.filter((n) => !MOBILE.includes(n.href) && n.href !== "/");

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--tide)" />
        <path d="M6 18c3.3 0 3.3-2.5 6.6-2.5S15.9 18 19.2 18s3.3-2.5 6.8-2.5" stroke="var(--tide-ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M16 7v14l-4 4h8l-4-4" stroke="var(--tide-ink)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[1.5rem] leading-none tracking-tight">Keel</span>
    </span>
  );
}

const Loading = () => <div className="min-h-dvh bg-fog" aria-busy="true" />;

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="num ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1.5 text-[11px] font-semibold text-surface" aria-label={`${n} new`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  local: "Everything stays on this device. Nothing is sent anywhere.",
  saved: "Saved to your account",
  saving: "Saving…",
  offline: "Offline. Changes are kept here and will save when you reconnect.",
};

export function Shell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { state, ready, sync } = useStore();
  const { unread, newReplies } = useSharing();
  const path = usePathname();

  if (cloudEnabled) {
    if (!auth.loaded) return <Loading />;
    if (auth.recovering) return <NewPasswordScreen />;
    if (!auth.session) return <AuthScreen />;
  }
  if (!ready) return <Loading />;
  if (!state.settings.onboarded) return <Onboarding />;

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const badgeFor = (href: string) => (href === "/shared" ? unread + newReplies : 0);
  const moreActive = ["/more", ...MORE_LINKS.map((m) => m.href)].some((p) => path.startsWith(p));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <Reminders />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-5 py-7 lg:flex">
        <Link href="/" className="mb-10 px-2">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition",
                isActive(href) ? "bg-tide-soft font-medium text-tide-deep" : "text-muted hover:bg-surface hover:text-ink",
                href === "/urge" && !isActive(href) && "text-tide",
              )}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
              <Badge n={badgeFor(href)} />
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3 text-[13px] leading-snug text-muted">
          {auth.profile && <p className="mb-1 truncate font-medium text-ink">{auth.profile.display_name || auth.profile.email}</p>}
          <p className={sync === "offline" ? "text-ember" : undefined}>{SYNC_LABEL[sync]}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between px-5 pt-5 lg:hidden">
          <Link href="/">
            <Logo />
          </Link>
          {sync === "offline" && <span className="text-[13px] text-ember">Offline</span>}
        </header>
        <main className="mx-auto w-full max-w-[920px] px-5 pb-32 pt-8 sm:px-8 lg:pb-16 lg:pt-12">{children}</main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MOBILE.map((href) => {
          const item = NAV.find((n) => n.href === href);
          const Icon = item?.icon ?? Menu;
          const label = item ? (item.short ?? item.label) : "More";
          const active = href === "/more" ? moreActive : isActive(href);
          const urge = href === "/urge";
          const n = badgeFor(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx("relative flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-tide-deep" : "text-muted")}
            >
              <span className={cx("relative grid place-items-center", urge && "-mt-5 h-12 w-12 rounded-full bg-tide text-tide-ink shadow-[0_6px_20px_-6px_var(--tide)]")}>
                <Icon size={urge ? 22 : 20} strokeWidth={1.8} />
                {n > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-brass ring-2 ring-surface" aria-label={`${n} new`} />}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
