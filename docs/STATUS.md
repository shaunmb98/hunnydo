# Status

## What works

Each item below was clicked through in a real browser against the real services, not only unit-checked.

**For a homeowner**
- Sign up, sign in, sign out, and password reset with your own email (Firebase Auth).
- Address onboarding with live suggestions. Tested with addresses in Arizona, New York, Louisiana, Texas, Tennessee, Washington DC, rural Montana, London and Toronto.
- Local pros for eight core trades loaded at sign-up, and 19 more services (dryer vents, garage doors, pool, locksmith, gutters and so on) loaded the first time you open them.
- Photo or text diagnosis by Claude: likely cause, urgency, what to do now, DIY verdict, local cost range, questions pros ask, terms to know, red flags, and an editable job brief. About 8 seconds for text, longer with a photo.
- Add a detail and re-check a diagnosis.
- Ranked pros with a score that explains itself, and a review read that scores how likely each pro is to pick up and show up.
- Quote requests written as an email, a text and a call script per pro, sent from your own phone or email.
- A quote pipeline per job: ready to send, contacted, no answer, quoted, hired, passed. Notes and history on every pro.
- Paste a pro's reply and have the price, fee, timing, warranty and inclusions pulled out for you to confirm.
- Side by side comparison against the expected price range, with a second opinion on request.
- Hire a pro, undo a booking, and get a polite note to send the pros you passed on.
- My crew: saved pros by trade, your own notes, add people you already use.
- My house: year built, square footage, lot size and parcel number from county records where available, plus the things only you know (pipe material, equipment ages). These feed the diagnosis.
- Email to the signed-in user: the job brief after a diagnosis and a confirmation after a booking.

**For a pro**
- One login switches between "My home" and "My business". A pro can sign up without setting up a home.
- Claim a Google listing, set trades and service radius, and keep a business profile.
- A job board of nearby jobs that homeowners chose to open to bids, showing the brief, photo, city and distance. Never the street address.
- Bid on a job. The bid lands on the homeowner's quote board next to the quotes they collected themselves.
- My bids, with whether each was hired or passed.

## What is incomplete

- **Business verification is not built.** A claimed listing is marked "claimed, not yet verified" everywhere. The plan is an automated call to the phone number on the Google listing that reads out a code. Until that exists, anyone can claim a listing first.
- **County records are direct for Maricopa County, Arizona only.** Every county runs its own system. Elsewhere the app searches for the home's county and links to the official assessor page. In testing it found the right office each time but rarely any facts for the exact address, and it does not borrow a neighbor's numbers. National coverage needs a paid data source.
- **No permit history yet.** There is no open, per-address permit source for Phoenix or Scottsdale that I could find. Notes are in `house-records-spike.md`.
- **Wall type, roof type and pool are empty.** The county's public map layer does not carry them. Its token-based API does.
- **The app does not contact pros for you.** By design for now: you send every message yourself. Voice agents that place the calls and book the visit were the original idea and are the next big piece.
- **No inbox connection.** You paste replies in. Reading them straight from email is future work.
- **Quotes are in US dollars and distances in miles** everywhere, including outside the US.
- **Rate limiting is per server instance**, held in memory. Fine for one small service, not for scale.
- **No automated test suite yet.** Verification so far is real API calls, browser walkthroughs as a homeowner and as a pro, and two independent code reviews. Their findings and the fixes are in the git history.
- **No native mobile app.** The web app is built phone-first and the API accepts a standard token, so a mobile client could use the same backend.

## What I would build next

1. Voice agents that call the shortlisted pros with the job brief, collect a price and a time, and put the result on the quote board.
2. Real business verification, then reviews from homeowners who hired through the app.
3. Inbox and text integration so quotes arrive on their own.
4. County and permit coverage beyond Maricopa.
5. Home warranty integration. Many homeowners already pay for a warranty plan and don't know what it covers. The app would hold your plan, tell you at diagnosis time whether the repair is likely covered and what the service fee is, and open the claim with the warranty company before you call anyone else.
6. Maintenance reminders from what the app knows about the house: water heater age, roof age, filter changes.
