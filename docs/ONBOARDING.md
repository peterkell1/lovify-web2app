# Lovify Song-Chat — Getting Started (no coding required)

This is for someone who **doesn't code**. You'll use the **Claude Code desktop
app** — an AI helper that does all the technical work for you. You describe what
you want in plain English; it writes, tests, and saves the code. You preview it,
and **Peter approves it before anything goes live.**

**You can't break anything live.** Everything you make is a *draft* that Peter
reviews first.

---

## Part A — Install three things (one time, ~15 min)

> Don't worry about understanding these — just install them like any other app
> (keep clicking Continue / Next / Install).

1. **Node.js** — the engine that runs the website on your laptop.
   Go to **https://nodejs.org** and click the big **LTS** button to download, then
   install it.
2. **Claude Code (desktop app)** — your AI helper.
   Go to **https://claude.ai/code**, sign in, and download the **desktop app** for
   your computer (Mac or Windows). Install it.
3. **A Claude account (Pro or Max)** — to power Claude Code.
   Sign up at **https://claude.ai** if you don't have one, then sign into the
   Claude Code app with it.

---

## Part B — Ask Peter for these (only he can do them)

| What | Why | Send Peter |
|---|---|---|
| **GitHub access** to `peterkell1/lovify-web2app` | So Claude Code can open the project | Your **GitHub username** (make one at https://github.com if needed) |
| **The secret keys file** (`.env.local`) | So the site runs with real data on your laptop | He sends it **securely** (1Password — not email) |
| Dashboards (Vercel, Supabase, etc.) — *later* | Viewing data; not needed to start | — |

---

## Part C — Open the project (first time only)

1. Open the **Claude Code** desktop app and sign in.
2. When it asks, **connect your GitHub**.
3. In the chat box, paste this and send it:

   > Please clone the GitHub project **peterkell1/lovify-web2app**, switch to the
   > branch **feat/song-chat-v2-scaffold**, install it, and run it so I can
   > preview it in my browser. I don't code — do every step for me and tell me if
   > you need anything (like a secret keys file).

4. As it works, it will **run commands and ask you to approve them** — just click
   **Approve / Yes** each time. (That's Claude doing the "terminal" work *for* you.)
5. If it asks for **secret keys / an `.env.local` file**, that's the file Peter
   sent you — drag it into the project, or paste where Peter told you.
6. When it's running, it gives you a link. Open **`http://localhost:3000/offer/v2-chat`**
   in your browser — that's the song page you'll work on. 🎶

> After the first time, you just open Claude Code and say *"run the project so I
> can preview it"* and you're going.

---

## Part D — Paste this FIRST, every session (your safety net)

Before each task, paste this so Claude follows the rules. Add what you want at the
end:

> Hi Claude. I'm working on the Lovify web2app **song-chat** funnel and I don't
> code — please do all the technical work and explain things simply.
> **Rules you must always follow:**
> 1. The **live funnel is the `/offer` page** — NEVER change how the live version
>    (called "V1") looks or behaves.
> 2. I only work on the **"V2" test version** — make every change behind
>    `variant === 'v2'`, and let me preview it at **`/offer/v2-chat`**.
> 3. **Always work on a new branch and open a Pull Request for Peter to review.**
>    Never merge to `main` or deploy to production yourself.
> 4. After each change, run `npm run build` to confirm nothing's broken.
>
> Here's what I'd like to do: _(describe it — e.g. "make the first question
> friendlier and add a sparkle emoji")_

As long as you paste this, you literally cannot affect the live funnel.

---

## About the "terminal" (you barely touch it)

The terminal is a black/white text box where commands run. It looks scary, but
**Claude Code runs every command FOR you** — when it needs to run something it
shows you and asks to **Approve**; you just say yes. If you see text scrolling in
a window, that's just it working — you can ignore it.

You'll rarely open one yourself. If you ever need to:
- **Mac:** `⌘ + Space` → type **Terminal** → Enter.
- **Windows:** Start → type **PowerShell** → Enter.

Golden rule: **only paste commands Peter or Claude gave you**, then press Enter.
Nothing runs until you press Enter, so you can't break anything by looking around.

---

## How you actually work (the loop)

1. **Tell Claude what you want** (plain English). It writes the code.
2. **Preview it** — ask Claude *"run it and open `/offer/v2-chat` so I can see it,"*
   or refresh that page in your browser. Changes show up live.
3. **Tweak** until you love it ("bigger", "different wording", "move it up").
4. **Hand it off** — ask Claude to *"open a Pull Request for Peter to review."*
   Peter approves it; that's when it becomes real.

You never publish anything yourself. You make drafts; Peter approves them.

---

## ⚠️ The golden rules

1. **`/offer` is the LIVE funnel** — real visitors and ad money. Never change the
   live (V1) experience. Unsure? Ask Claude *"will this change the live V1 funnel?"*
   — the answer should always be **no**.
2. **Your sandbox is `/offer/v2-chat`.** That's where you preview. Real visitors
   don't see it.
3. **Everything is a draft (a Pull Request) that Peter approves.** Never merge or
   deploy yourself.
4. **When in doubt, ask Peter.** No question is dumb.

---

## Every tool we use — and how you get access

Get your **own login** for each (Peter invites you **by email** — you don't share
his password). Watch your inbox for invite emails and accept them.

**🟢 Need these to start (Day 1):**

| Tool | What it's for | Where to log in | How Peter adds you |
|---|---|---|---|
| **GitHub** | The code (Claude Code opens it) | https://github.com | Invites your username to `peterkell1/lovify-web2app` |
| **Claude** (for Claude Code) | Your AI helper | https://claude.ai | You make your own Pro/Max account |
| **The `.env.local` keys file** | Runs the site on your laptop | (a file, not a login) | Sends it to you via 1Password |

**🟡 You'll want these soon:**

| Tool | What it's for | Where to log in | How Peter adds you |
|---|---|---|---|
| **Vercel** | Hosting + live deploys + preview links | https://vercel.com | Invites you to the project/team |
| **PostHog** | Analytics — how the funnel performs | https://us.posthog.com | Org → Members → Invite (project: 404083) |
| **Supabase** | The database + backend (project: Lovify-dev) | https://supabase.com/dashboard | Org → Team → Invite |

**🟣 As you need them (specialized):**

| Tool | What it's for | Where to log in | How Peter adds you |
|---|---|---|---|
| **RevenueCat** | Subscriptions / payments | https://app.revenuecat.com | Project → Collaborators → Invite (project: Lovify Music) |
| **Anthropic** | The Claude AI key the song chat uses | https://console.anthropic.com | Console → Members → Invite |
| **Kie.ai** | Song generation (Suno) | https://kie.ai | Shared login via 1Password (no team seats) |
| **Meta Business** | Facebook pixel + ads tracking | https://business.facebook.com | Business Settings → People → Add |

**Quick links (no login needed):**

| Link | What it is |
|---|---|
| **https://claude.ai/code** | Claude Code — desktop app + where you work |
| **https://github.com/peterkell1/lovify-web2app** | The project |
| **`http://localhost:3000/offer/v2-chat`** | The song page you preview (when the project is running) |
| **https://demo.trylovify.com/offer** | The LIVE funnel — do NOT edit V1 |

> You don't need *all* of these to start — GitHub + your Claude account + the keys
> file are enough to begin editing the song page. The rest unlock as your tasks
> need them. If something says "you don't have access," that's your cue to ask
> Peter for that one.

---

## If you get stuck

- **Claude asks for secret keys / an `.env` file** → ask Peter; he sends them
  securely.
- **Not sure something's safe** → paste the golden rules and ask Claude *"is this
  safe for the live funnel?"*
- **Anything broke / a scary red error** → just tell Claude *"that gave an error,
  please fix it"* — it can read the error and sort it out.
- **Anything else** → ask Peter.

The song chat lives in `OnboardingChat.tsx` if you ever want to point Claude
straight at it. Welcome aboard! 🎶
