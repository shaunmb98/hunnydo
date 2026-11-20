import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { TradeIcon } from "@/components/TradeIcon";
import { LinkButton, Logo } from "@/components/ui";
import { CORE_TRADES, MORE_TRADES } from "@/lib/trades";

const STEPS = [
  {
    title: "Take a photo of what broke",
    body: "Add a sentence about what you're seeing. You get back what it probably is, whether it can wait, what to do right now and what it usually costs.",
  },
  {
    title: "See who's worth calling",
    body: "Local pros in order of who's likely to pick up and show up, going by their reviews, how close they are and whether they're open. Nobody pays to be higher on the list.",
  },
  {
    title: "Send one write-up to all of them",
    body: "The problem is written up once, in your words. Text, email or call each pro yourself, then paste in what they say. Price, timing and fine print line up side by side.",
  },
  {
    title: "Keep the ones who did right by you",
    body: "The pro you hire goes on your crew list with your notes. Next time something breaks, you start with people you already trust.",
  },
];

const QUOTES = [
  { name: "Ridgeline Garage Doors", score: 91, price: "$285", when: "Today, 2 to 4" },
  { name: "Copper State Door Co.", score: 84, price: "$340", when: "Tomorrow morning" },
  { name: "Overhead Door Works", score: 78, price: "Waiting", when: "Texted 1 hr ago" },
];

/** An illustration of the job screen. The business names are made up. */
function Preview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-lift">
      <div className="flex gap-4 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/samples/garage-door-spring.jpg"
          alt="A snapped garage door spring on a garage floor"
          className="h-24 w-24 shrink-0 rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">This week</span>
          <p className="mt-1.5 font-display text-xl font-bold leading-tight">Broken garage door spring</p>
          <p className="mt-1 text-sm text-ink-soft">Usually $250 to $450. Don&apos;t pull the red release cord.</p>
        </div>
      </div>
      <div className="border-t border-line bg-paper px-5 py-3">
        <p className="text-sm font-bold">Your quotes</p>
      </div>
      <ul className="divide-y divide-line">
        {QUOTES.map((q) => (
          <li key={q.name} className="flex items-center gap-3 px-5 py-3.5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] font-display text-sm font-bold ${
                q.score >= 80 ? "border-go text-go" : "border-honey-dark text-ink"
              }`}
            >
              {q.score}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{q.name}</span>
              <span className="block text-sm text-mute">{q.when}</span>
            </span>
            <span className={`font-display text-lg font-bold ${q.price === "Waiting" ? "text-mute" : ""}`}>{q.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="bg-white">
      <div className="bg-honey">
        <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Logo size="lg" />
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login?next=/biz/claim" className="hidden rounded-lg px-3 py-2 font-semibold hover:bg-ink/10 sm:inline">
              For pros
            </Link>
            <Link href="/login?mode=signin" className="rounded-lg px-3 py-2 font-semibold hover:bg-ink/10">
              Sign in
            </Link>
            <LinkButton href="/login" variant="dark">
              Get started
            </LinkButton>
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-14">
          <div>
            <h1 className="text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
              Something broke. Explain it once.
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-ink/80">
              Snap a photo. HunnyDo works out what&apos;s wrong, lines up the local pros most likely to show up, and
              keeps every quote in one place until you pick one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/login" variant="dark" size="lg">
                Start with your address <ArrowRight className="h-5 w-5" aria-hidden />
              </LinkButton>
              <LinkButton href="/login?mode=signin" variant="ghost" size="lg">
                I have an account
              </LinkButton>
            </div>
            <ul className="mt-8 space-y-2 text-[15px] font-semibold text-ink/80">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden /> Nobody pays to rank higher
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden /> You send every message yourself
              </li>
            </ul>
          </div>
          <Preview />
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">How it goes from broken to booked</h2>
        <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="font-display text-6xl font-bold leading-none text-honey-dark">{i + 1}</span>
              <h3 className="mt-3 text-xl font-bold leading-snug">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl font-bold sm:text-5xl">Every trade your house needs</h2>
            <p className="max-w-sm text-ink-soft">
              Pros for the first eight are lined up the moment you add your address. The rest load when you need them.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CORE_TRADES.map((t) => (
              <Link
                key={t.id}
                href="/login"
                className="group rounded-2xl border border-line bg-white p-5 shadow-card transition-colors hover:border-ink"
              >
                <TradeIcon trade={t.id} className="h-7 w-7 text-ink" />
                <p className="mt-4 text-lg font-bold">{t.label}</p>
                <p className="mt-1 text-sm leading-snug text-ink-soft">{t.examples}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 leading-relaxed text-ink-soft">
            <span className="font-bold text-ink">Also:</span> {MORE_TRADES.map((t) => t.label.toLowerCase()).join(", ")}.
          </p>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-20 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="font-bold text-honey">Why this exists</p>
            <blockquote className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-[32px] sm:leading-[1.25]">
              My main water line broke. I spent hours calling plumbers who didn&apos;t pick up, explaining the same
              problem over and over, and trying to keep everyone&apos;s quotes and schedules straight. HunnyDo is the
              tool I wanted that week.
            </blockquote>
            <p className="mt-5 text-white/70">Shaun, founder</p>
          </div>
          <div className="rounded-3xl bg-white p-7 text-ink">
            <h3 className="text-2xl font-bold">Do this work for a living?</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">
              Claim your business with the same kind of account. See jobs nearby that homeowners opened to bids, each
              with a photo and a full write-up, and price it before you pick up the phone.
            </p>
            <div className="mt-6">
              <LinkButton href="/login?next=/biz/claim">Claim your business</LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-honey">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-12">
          <h2 className="text-3xl font-bold sm:text-4xl">Got something that needs fixing?</h2>
          <LinkButton href="/login" variant="dark" size="lg">
            Start with your address <ArrowRight className="h-5 w-5" aria-hidden />
          </LinkButton>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-mute">
          <Logo />
          <span className="flex gap-5">
            <Link href="/login?mode=signin" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/login?next=/biz/claim" className="hover:text-ink">
              For pros
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
