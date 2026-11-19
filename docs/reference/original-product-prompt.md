# Original product prompt (verbatim, dictated by Shaun before the timer started)

Primarily what I want us to build is a home service assistant application tool. Generally speaking what I'm imagining is you can go ahead and take a picture of some problem around your house. Say you take a picture of a busted water main. It would then go ahead and try to diagnose the solution (again using AI and AI evals and solutions like that) and then get you in touch with local plumbers, ideally connecting via the Google Maps API for all the local plumbers rated by who's most likely to reach out.

In a perfect world it would include the ability for you to either shoot them emails or have calls and implement the voice agents to actually have the conversation, schedule the consultation, on/off switch for service charge fees, and so on and so forth. This should work across all the home service disciplines.

I'd imagine the app also looks like you can maintain and integrate a list of your home service vendors so you can just maintain it in one spot. This is primarily going to be a web application with future scopes looking towards a mobile application but primarily speaking you should be able to build this out for web to begin with.

Generally speaking this problem came about when I was trying to fix my main water line. It took me hours and hours of just calling different plumbers and not getting them to come out, or not quoting them, or not being able to manage the schedules and follow them. I then had to talk to them all, coordinate their schedules, and be able to describe the same problem 150 times.

Even after I got done with it I just want to make sure that I keep them for my home. These are the people that I want to use. What I imagine the onboarding experience being like is: "What's your address?" and then basically pre-caching a lot of the plumbers in the area, as well as the reviews, and sorting them accordingly.

The primary functionality is also being like, "Hey we'll reach out and talk and get quotes and bids," and being able to maintain and store your bids and quotes and choose which one you want to go forward with. Call it a handy helper or something like that, which is basically just a full catalog of all your home service reps and techs in your area.

What I'd imagine this starts to look like is a very powerful ability or a very powerful tool to just be able to manage home service contracts and engagements and so on and so forth (rather than having to deal with them all sporadically and across Google and across your own phone calls, trying to get them coordinated, scheduled, and sent out and so forth).

## Decisions made before the timer (accounts and infrastructure only, no app code)

- Name: HunnyDo (doithunny.com)
- One Google Cloud project: Firebase Auth + Firestore + Storage, Cloud Run hosting, Google Places, Secret Manager
- Claude (Anthropic API) for photo diagnosis, review analysis, quote extraction
- Resend for transactional email to the signed-in user
- Outreach to pros is sent by the homeowner from their own email/phone (copy / mailto / tel). The app never contacts a business on its own.
- Future scope: voice agents that call pros, inbox integration, SMS, native mobile app
