"use client";
import { signOut } from "firebase/auth";
import { ClipboardList, Home, LogOut, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { cx } from "@/lib/format";
import { useAuth } from "./AuthProvider";
import { LinkButton, Logo, Spinner } from "./ui";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/pros", label: "Find pros", icon: Search },
  { href: "/crew", label: "My crew", icon: Users },
];

/** Signed-in frame: guards auth + onboarding, top nav on desktop, tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!profile?.home) router.replace("/onboarding");
  }, [loading, user, profile, router]);

  if (loading || !user || !profile?.home) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Getting your house in order" />
      </div>
    );
  }

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/home" aria-label="HunnyDo home">
            <Logo />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => (
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
            <LinkButton href="/jobs/new" size="sm">
              <Plus className="h-4 w-4" aria-hidden /> Something broke
            </LinkButton>
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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-ink bg-white md:hidden">
        {NAV.map((n) => (
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
