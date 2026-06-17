# Lovify Song-Chat — Getting Started (no coding required)

This is written for someone who **doesn't code**. You'll use a tool called
**Claude Code** that does all the technical work for you — you just describe what
you want in plain English, and it writes, tests, and saves the code. You then
preview it, and Peter approves it before anything goes live.

**You can't break anything live.** Everything you make is a *draft* that Peter
reviews first (more on this below).

---

## The 4 steps to get started

### Step 1 — Ask Peter for access (he has to do these for you)
| What | Why |
|---|---|
| **GitHub** — he invites you to `peterkell1/lovify-web2app` | So Claude Code can work on the project. Send Peter your GitHub username. |
| **A Claude account** (Pro/Max) | To run Claude Code. Sign up at https://claude.ai |
| **Dashboards** (Vercel, Supabase, PostHog, RevenueCat) — *later, as needed* | For viewing data. Not needed to start. |

### Step 2 — Get Claude Code
Go to **https://claude.ai/code** and sign in with your Claude account.
- Easiest: use it **right in your browser** (nothing to install).
- Or download the **desktop app** (Mac/Windows) from the same place.

### Step 3 — Connect it to the project
In Claude Code, connect your **GitHub**, then open the repository
**`peterkell1/lovify-web2app`**. (If you don't see it, Peter hasn't added you yet —
go back to Step 1.)

### Step 4 — Paste this message first, every time
At the **start of every session**, paste this in so Claude knows the rules and
keeps you safe. Then add what you actually want at the end:

> Hi Claude. I'm working on the Lovify web2app **song-chat** funnel and I don't
> code — please do all the technical work for me and explain things simply.
> **Rules you must always follow:**
> 1. The **live funnel is the `/offer` page** — NEVER change how the live version
>    (called "V1") looks or behaves.
> 2. I only work on the **"V2" test version** — make every change behind
>    `variant === 'v2'`, and let me preview it at **`/offer/v2-chat`**.
> 3. **Always work on a new branch and open a Pull Request for Peter to review.**
>    Never merge to `main` or deploy to production yourself.
> 4. After each change, run `npm run build` to confirm nothing's broken.
>
> Here's what I'd like to do: _(describe it here — e.g. "make the first question
> friendlier and add a sparkle emoji")_

That paragraph is your safety net. As long as you paste it, you literally cannot
affect the live funnel.

---

## How you actually work (the loop)

1. **Tell Claude what you want** (plain English). It writes the code for you.
2. **Preview it.** Ask Claude: *"open the page so I can see it"* — or open the
   preview link it gives you. The page to look at is **`/offer/v2-chat`**.
3. **Tweak** until you like it ("make it bigger", "change the wording", etc.).
4. **Hand it off.** Ask Claude to *"open a Pull Request for Peter to review."*
   Peter approves it — that's when it becomes real.

You never publish anything yourself. You make drafts; Peter approves them.

---

## ⚠️ The golden rules (this is the important part)

1. **`/offer` is the LIVE funnel — real visitors and ad money.** Do **not** change
   the live (V1) experience. If you're ever unsure, ask Claude *"will this change
   the live V1 funnel?"* — it should always be **no**.
2. **Your sandbox is the V2 test page:** `/offer/v2-chat`. That's where you
   preview. It's separate and safe — real visitors don't see it.
3. **Everything is a draft (a "Pull Request") that Peter approves.** Never hit
   merge/deploy yourself.
4. **When in doubt, ask Peter.** No question is dumb.

---

## Where things are

| Link | What it's for |
|---|---|
| **https://claude.ai/code** | Claude Code — where you do all your work |
| **https://github.com/peterkell1/lovify-web2app** | The project (Claude Code uses this) |
| **The V2 test page** (preview your work) | `…/offer/v2-chat` on the preview link Claude gives you |
| **Live funnel** (do NOT edit V1) | https://demo.trylovify.com/offer |

**Dashboards (login as you need them — ask Peter to invite you):**

| Service | Link | What it shows |
|---|---|---|
| Vercel | https://vercel.com | Where the site is hosted + preview links |
| Supabase | https://supabase.com/dashboard | The database/backend (project: Lovify-dev) |
| PostHog | https://us.posthog.com | Analytics — how the funnel is performing |
| RevenueCat | https://app.revenuecat.com | Subscriptions / payments |
| Anthropic | https://console.anthropic.com | The AI (Claude) the song chat uses |

---

## The part of the project you'll touch

You don't need to find files yourself — Claude Code does. But for reference, the
song chat lives in `src/components/onboarding/comeback1/OnboardingChat.tsx`. If
you want to point Claude at it, just say *"the song chat is in OnboardingChat.tsx."*

---

## If you get stuck

- **Claude Code asks for secret keys / an `.env` file** → ask Peter; he'll send
  them securely (don't paste keys into chats).
- **You're not sure if something is safe** → paste the golden rules above and ask
  Claude *"is this change safe for the live funnel?"*
- **Anything else** → ask Peter, or just ask Claude to explain.

Welcome aboard! 🎶
