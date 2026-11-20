import { Camera, ClipboardCheck, PhoneCall, Users } from "lucide-react";
import { Badge, Card, LinkButton, Logo } from "@/components/ui";
import { TradeIcon } from "@/components/TradeIcon";
import { CORE_TRADES as TRADES, MORE_TRADES } from "@/lib/trades";

const STEPS = [
  { icon: Camera, title: "Snap what broke", body: "Take a photo and say what you see. HunnyDo tells you what it probably is, and whether it can wait or you need to act now." },
  { icon: PhoneCall, title: "Reach the pros who pick up", body: "Local pros ranked by reviews, distance and how often people say they showed up. One write-up goes to all of them." },
  { icon: ClipboardCheck, title: "Line up the quotes", body: "Paste in what each pro told you. See price, timing and fine print side by side, then pick one." },
  { icon: Users, title: "Keep your crew", body: "The people who did right by you stay on your list, with notes and history, for the next time something breaks." },
];

export default function Landing() {
  return (
    <div>
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Logo size="lg" />
        <div className="flex items-center gap-2">
          <LinkButton href="/login?mode=signin" variant="ghost">Sign in</LinkButton>
          <LinkButton href="/login">Get started</LinkButton>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-12">
        <div>
          <Badge tone="honey">For anyone who has called nine plumbers in one afternoon</Badge>
          <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] sm:text-6xl">
            Something broke.
            <br />
            Describe it <span className="marker">once.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Snap a photo. HunnyDo works out what&apos;s wrong and finds the local pros most likely to show up. Your quotes
            stay in one place, and when the job is done the good pros stay in your crew.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/login" size="lg">Start with your address</LinkButton>
            <LinkButton href="/login?mode=signin" size="lg" variant="outline">I have an account</LinkButton>
          </div>
          <p className="mt-4 text-sm text-mute">Free to use. HunnyDo never contacts a business without you.</p>
        </div>

        <Card className="rotate-1 p-5">
          <div className="stripes -mx-5 -mt-5 mb-4 h-3 rounded-t-[14px] border-b-2 border-ink" />
          <Badge tone="red">Emergency</Badge>
          <h3 className="mt-2 text-2xl font-extrabold">Leaking main water line</h3>
          <p className="mt-1 text-ink-soft">
            Water pooling near the meter usually means a break in the service line between the street and the house.
          </p>
          <div className="mt-4 rounded-xl border-2 border-ink bg-honey-soft p-3 text-sm">
            <p className="font-bold">Do this now</p>
            <p>Shut off the water at the street-side meter valve. Don&apos;t dig near the gas line.</p>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { n: "Ace Rooter & Repipe", s: 94, q: "$1,850", t: "Tomorrow 8am" },
              { n: "Desert Line Plumbing", s: 88, q: "$2,400", t: "Thursday" },
              { n: "Valley Leak Pros", s: 81, q: "Waiting", t: "Called 2 hr ago" },
            ].map((r) => (
              <div key={r.n} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-go text-sm font-extrabold text-white">{r.s}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.n}</p>
                  <p className="text-xs text-mute">{r.t}</p>
                </div>
                <p className="font-display text-lg font-extrabold">{r.q}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="border-y-2 border-ink bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-honey shadow-hard-sm">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-bold">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1 text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl font-extrabold">Every trade your house needs</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TRADES.map((t) => (
            <Card key={t.id} flat className="p-4">
              <TradeIcon trade={t.id} tile />
              <p className="mt-3 font-bold">{t.label}</p>
              <p className="text-sm text-ink-soft">{t.examples}</p>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-ink-soft">
          <span className="font-bold text-ink">Also covered:</span>{" "}
          {MORE_TRADES.map((t) => t.label.toLowerCase()).join(", ")}.
        </p>
        <Card className="mt-10 bg-honey p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Why this exists</h2>
          <p className="mt-2 max-w-3xl text-lg">
            My main water line broke. I spent hours calling plumbers who didn&apos;t pick up, explaining the same
            problem over and over, and trying to keep everyone&apos;s quotes and schedules straight. HunnyDo is the tool I wanted that
            day.
          </p>
          <div className="mt-5">
            <LinkButton href="/login" variant="dark" size="lg">Set up my house</LinkButton>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <Card flat className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold">Do this work for a living?</h2>
            <p className="mt-2 text-ink-soft">
              Claim your business with the same login. You&apos;ll see jobs nearby that homeowners opened to bids, each
              with a photo and a full write-up, so you can price it before you pick up the phone.
            </p>
          </div>
          <LinkButton href="/login?next=/biz/claim" variant="outline" size="lg">Claim my business</LinkButton>
        </Card>
      </section>

      <footer className="border-t-2 border-ink bg-white py-6 text-center text-sm text-mute">
        HunnyDo · doithunny.com · Built in two hours for Casper Studios
      </footer>
    </div>
  );
}
