import Link from "next/link";
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
    body: "The problem is written up once, in your words. You text, email or call each pro yourself. Paste in what they say and the price, timing and fine print line up next to each other.",
  },
  {
    title: "Keep the ones who did right by you",
    body: "The pro you hire goes on your crew list with your notes. Next time something breaks, you start with people you already trust.",
  },
];

export default function Landing() {
  return (
    <div className="bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-4 text-[15px]">
            <Link href="/login?next=/biz/claim" className="hidden text-ink-soft hover:text-ink sm:inline">
              For pros
            </Link>
            <Link href="/login?mode=signin" className="text-ink-soft hover:text-ink">
              Sign in
            </Link>
            <LinkButton href="/login" size="sm">
              Get started
            </LinkButton>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:py-14 md:grid-cols-[1.3fr_1fr] md:items-start">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Something broke at your house. Explain it once.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            HunnyDo works out what&apos;s wrong from a photo, lists the local pros most likely to show up, and keeps
            every quote in one place until you pick one.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <LinkButton href="/login" size="lg">
              Start with your address
            </LinkButton>
            <Link href="/login?mode=signin" className="link text-[15px]">
              I already have an account
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-sm text-mute">
            You send every message yourself. HunnyDo doesn&apos;t call or email a business on your behalf.
          </p>
        </div>

        <figure className="md:pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/samples/garage-door-spring.jpg"
            alt="A snapped garage door spring lying on a garage floor"
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
          <figcaption className="mt-2 text-sm text-ink-soft">
            &quot;Heard a loud bang in the garage last night and now the door won&apos;t open.&quot; That photo and that
            sentence are enough to start.
            <span className="mt-1 block text-xs text-mute">Photo: Garagedoorrepairlasvegas, Wikimedia Commons, CC BY-SA 4.0</span>
          </figcaption>
        </figure>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <h2 className="text-2xl font-bold">How it goes</h2>
          <ol className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="font-display text-2xl font-bold leading-none text-mute">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold leading-snug">{s.title}</h3>
                  <p className="mt-1 text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
          <h2 className="text-2xl font-bold">What it covers</h2>
          <p className="mt-1 text-ink-soft">
            Pros for the first eight are looked up the moment you add your address. The rest load when you need them.
          </p>
          <ul className="mt-5 columns-2 gap-x-8 text-[15px] leading-8 sm:columns-3 md:columns-4">
            {[...CORE_TRADES, ...MORE_TRADES].map((t) => (
              <li key={t.id} className="break-inside-avoid">
                <Link href="/login" className="link">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Why I built it</h2>
            <div className="mt-3 space-y-3 border-l-2 border-honey pl-4 text-[17px] leading-relaxed">
              <p>
                My main water line broke. I spent hours calling plumbers who didn&apos;t pick up, explaining the same
                problem over and over, and trying to keep everyone&apos;s quotes and schedules straight.
              </p>
              <p>
                When it was finally fixed, I wanted to hang on to the people who did the work. I had nowhere to put
                them. HunnyDo is the tool I wanted that week.
              </p>
              <p className="text-ink-soft">Shaun, founder</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Do this work for a living?</h2>
            <p className="mt-3 text-ink-soft">
              Claim your business with the same kind of account. You&apos;ll see jobs nearby that homeowners opened to
              bids, each with a photo and a full write-up, so you can price it before you pick up the phone.
            </p>
            <p className="mt-4">
              <Link href="/login?next=/biz/claim" className="link font-semibold">
                Claim your business
              </Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-mute">
          <span>HunnyDo</span>
          <span className="flex gap-4">
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
