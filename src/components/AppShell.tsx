"use client";
import { signOut } from "firebase/auth";
import { Briefcase, ClipboardList, Home, LogOut, NotebookText, Plus, Search, Send, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { cx } from "@/lib/format";
import { useAuth } from "./AuthProvider";
import { LinkButton, Logo, Spinner } from "./ui";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/pros", label: "Find pros", icon: Search },
  { href: "/crew", label: "My crew", icon: Users },
  { href: "/house", label: "My house", icon: NotebookText },
];

const BIZ_NAV = [
  { href: "/biz", label: "Job board", icon: Briefcase },
  { href: "/biz/bids", label: "My bids", icon: Send },
  { href: "/biz/profile", label: "Business profile", icon: Store },
];

const MODE_KEY = "hunnydo:mode";
type Mode = "home" | "biz";

/** "My home" / "My business" switch. One login can be both. */
function ModeSwitch({ mode, onPick, className }: { mode: Mode; onPick: (m: Mode) => void; className?: string }) {
  return (
    <div role="group" aria-label="Switch between your home and your business" className={cx("flex overflow-hidden rounded-lg border-2 border-ink text-xs font-bold", className)}>
      {(["home", "biz"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onPick(m)}
          className={cx("flex-1 whitespace-nowrap px-2.5 py-1.5 cursor-pointer", mode === m ? "bg-honey text-ink" : "bg-white text-ink-soft hover:bg-ink/5")}
        >
          {m === "home" ? "My home" : "My business"}
        </button>
      ))}
    </div>
  );
}

/** Signed-in frame: guards auth + onboarding, top nav on desktop, tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  const mode: Mode = path.startsWith("/biz") ? "biz" : "home";
  const hasBiz = !!profile?.businessId;
  // The homeowner guard (no home -> onboarding) doesn't apply on the business side.
  const blocked = mode === "biz" ? !hasBiz && path !== "/biz/claim" : !profile?.home;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (mode === "biz") {
      if (!hasBiz && path !== "/biz/claim") router.replace("/biz/claim");
    } else if (!profile?.home) router.replace("/onboarding");
  }, [loading, user, profile, router, mode, hasBiz, path]);

  // Come back to the side you used last. Only on the default landing page, so deep links still work.
  const restored = useRef(false);
  useEffect(() => {
    if (loading || !user || restored.current) return;
    restored.current = true;
    try {
      if (path === "/home" && localStorage.getItem(MODE_KEY) === "biz") router.replace(hasBiz ? "/biz" : "/biz/claim");
    } catch {
      // storage can be blocked; the switch still works
    }
  }, [loading, user, path, hasBiz, router]);

  function pickMode(next: Mode) {
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore
    }
    if (next === mode) return;
    router.push(next === "biz" ? (hasBiz ? "/biz" : "/biz/claim") : "/home");
  }

  if (loading || !user || blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label={mode === "biz" ? "Opening your business" : "Getting your house in order"} />
      </div>
    );
  }

  const nav = mode === "biz" ? BIZ_NAV : NAV;
  const active = (href: string) => (href === "/biz" ? path === "/biz" : path === href || path.startsWith(href + "/"));

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href={mode === "biz" ? "/biz" : "/home"} aria-label="HunnyDo home">
            <Logo />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "rounded-lg px-3 py-2 text-[15px] font-bold",
                  active(n.href) ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeSwitch mode={mode} onPick={pickMode} className="hidden md:flex" />
            {mode === "home" && (
              <LinkButton href="/jobs/new" size="sm">
                <Plus className="h-4 w-4" aria-hidden />
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">New job</span>
                  <span className="hidden sm:inline">Something broke</span>
                </span>
              </LinkButton>
            )}
            <button
              onClick={() => signOut(auth).then(() => router.replace("/"))}
              className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 cursor-pointer"
              aria-label="Sign out"
              title={`Sign out ${user.email ?? ""}`}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="border-t border-line px-4 py-1.5 md:hidden">
          <ModeSwitch mode={mode} onPick={pickMode} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>

      <nav className={cx("fixed inset-x-0 bottom-0 z-30 grid border-t-2 border-ink bg-white md:hidden", mode === "biz" ? "grid-cols-3" : "grid-cols-5")}>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cx(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold",
              active(n.href) ? "bg-honey text-ink" : "text-ink-soft",
            )}
          >
            <n.icon className="h-5 w-5" aria-hidden />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
