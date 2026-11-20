# HunnyDo

Snap a photo of what broke. Get a diagnosis, the local pros most likely to show up, and every quote in one place. When the job is done, the good ones stay in your crew.

**Live app:** https://hunnydo-336070400804.us-central1.run.app
**Built for:** the Casper Studios take-home, in a 2-hour timebox. The brief and my original product prompt are in [`docs/reference/`](docs/reference/).

## Why I built this

My main water line broke. I spent hours calling plumbers who didn't pick up, explaining the same problem to each one who did, and trying to keep everyone's quotes and schedules straight. After it was fixed I wanted to hold on to the people who did right by me, and I had nowhere to put them.

HunnyDo is the tool I wanted that day. It is for a homeowner with a problem, a phone, and no idea who to call.

## What you can do

1. **Sign up** with your own email and password (Firebase Auth, no demo logins).
2. **Enter your address.** The app looks up pros near you across eight trades through Google Places and ranks them.
3. **Report a problem.** Take or upload a photo and say what you see. Claude looks at the photo and returns what it probably is, how urgent it is, what to do right now, whether you can fix it yourself, what a pro usually charges, the questions pros will ask, and red flags to watch for in quotes.
4. **Get your job brief.** One write-up of the problem in your own voice, so you describe it once. You can edit it.
5. **See who to call.** Pros for that trade, ranked by a score that explains itself. "Check who actually shows up" has Claude read each pro's Google reviews for signs they answer the phone and turn up on time.
6. **Request quotes.** The app writes an email, a text, and a 20-second call script for each pro you pick. You send them from your own phone or email. HunnyDo never contacts a business on its own.
7. **Log quotes.** Paste whatever the pro sent back, however messy. Claude pulls out the price, service fee, timing, warranty, and what's included. You confirm before it saves.
8. **Compare and decide.** Quotes side by side, checked against the expected price range, with an optional second opinion on which to pick and what to ask first.
9. **Hire.** One pro is marked hired, the rest get a polite "went another way" note you can send, and you get a confirmation email.
10. **Keep your crew.** Hired pros land in My crew with notes and history. You can add people you already trust.

## How the ranking works

The score in [`src/lib/ranking.ts`](src/lib/ranking.ts) is plain arithmetic, not a model call:

- **Quality (45 points).** Star rating pulled toward an average until there are enough reviews to trust it, so 5.0 from 6 reviews does not beat 4.8 from 900.
- **Responsiveness (25).** From the review read. Unknown counts as neutral.
- **Distance (15).** Full marks within 3 miles, none past 25.
- **Reachable (up to 19).** Open now, has a phone number, 24-hour service. Worth more when the job is an emergency.
- **In your crew (8).** People you already trust go first.

Each score comes with the reasons behind it.

## Stack

- **Next.js 15** (App Router) and **TypeScript**, Tailwind CSS
- **Firebase**: Auth (email and password), Firestore, Storage
- **Claude** (`claude-opus-5-5`) through the Anthropic SDK, with structured outputs validated by Zod
- **Google Places API (New)** for address lookup, nearby pros, and reviews
- **Resend** for email to the signed-in user
- **Google Cloud Run** for hosting, Secret Manager for keys

Everything runs in one Google Cloud project. Each user's data lives under `users/{uid}` and security rules keep it there. The AI and Places calls run in API routes that check the Firebase ID token, so a mobile app could use the same backend later.

## Run it locally

You need Node 22 and your own keys.

```bash
git clone https://github.com/shaunmb98/hunnydo.git
cd hunnydo
npm install
cp .env.example .env.local   # then fill in the four values
npm run dev
```

`.env.local` needs:

| Variable | What it is |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a Firebase service account JSON file |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `MAPS_SERVER_KEY` | Google Maps key with Places API (New) enabled |
| `RESEND_API_KEY` | Resend key. Optional. Without it the app skips emails. |

To point the app at your own Firebase project, change the web config in `src/lib/firebase.ts` and the project ID in `src/lib/admin.ts`, then publish `firestore.rules` and `storage.rules`.

Other commands: `npm run typecheck`, `npm run build`. Deploying is `gcloud run deploy --source .` using the included `Dockerfile`.

## How it was built

I worked with Claude Code as a small team. I wrote the product direction and made the calls. One session built the shared foundation (data model, design system, auth, the Claude and Places helpers, ranking). Then separate agents built features on their own branches in separate git worktrees, each testing its own API routes against the real services before reporting back. Every branch was merged into `main` with a merge commit, clicked through in a real browser, and reviewed by an independent agent for bugs and security problems. The git history shows that sequence.

Account setup (the cloud project, API keys, DNS) was done before the timer started. No application code was written before the first commit.

## Status

See [`docs/STATUS.md`](docs/STATUS.md) for what works, what is incomplete, and what I would build next.
