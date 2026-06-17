# Lovify Web2App — Contributor Setup

Welcome! This guide gets you from zero to editing the **demo song page** (the
song-chat funnel) on your own laptop. No prior knowledge of this project needed.
You do **not** need Claude Code — any code editor works.

If you only do the **bold** steps, you'll be up and running.

---

## 0. What this project is (30-second version)

It's a **web-to-app funnel** — a web page that walks a visitor through creating a
personalized song, then asks them to subscribe. It's a **Next.js** website
(TypeScript + React). The part you'll work on is the **song chat** — the
conversational "make your song" experience.

- **Live site:** https://demo.trylovify.com/offer
- **The page you'll work on (V2 test version):** https://demo.trylovify.com/offer/v2-chat

---

## 1. Things only Peter can give you (ask him for these)

You can't make these yourself — Peter has to invite you.

| What | Why you need it | Peter does this |
|---|---|---|
| **GitHub repo access** | To get + edit the code | Invites you as a collaborator on `peterkell1/lovify-web2app` |
| **The `.env.local` file** (the secret keys) | So the app runs with real data | Sends it to you **securely** (1Password / not plain text/email) |
| **Vercel access** *(optional, later)* | To see live deploys + settings | Invites you to the Vercel project |
| **Supabase / PostHog / RevenueCat** *(optional, later)* | Database / analytics / billing | Invites you when you need them |

👉 **For just working on the song-page look & flow, you really only need the first
two.** The rest is "as needed."

> Note for Peter: please **don't** paste API keys into chats/email. Share
> `.env.local` via 1Password or a secrets manager.

---

## 2. Install the tools (one time, ~10 min)

1. **A code editor** — install **[VS Code](https://code.visualstudio.com/)** (free).
   (Cursor also works if you prefer.)
2. **Node.js** — install the **LTS (v20)** version from **https://nodejs.org**.
   This also installs `npm`, which we use to run the project.
3. **Git** — Mac usually has it. Check by opening **Terminal** and typing
   `git --version`. If it's missing, install **[Git](https://git-scm.com/downloads)**.
4. **A GitHub account** — sign up at **https://github.com** (then send Peter your
   username so he can add you).

> **Terminal** = the app where you type commands. On Mac press `⌘ + Space`, type
> "Terminal", hit Enter.

---

## 3. Get the code onto your laptop (one time)

In Terminal, run these **one at a time** (press Enter after each):

```bash
# 1. Go to where you keep projects (your Documents folder is fine)
cd ~/Documents

# 2. Download the code
git clone https://github.com/peterkell1/lovify-web2app.git

# 3. Go into the project
cd lovify-web2app

# 4. Switch to the branch where the new song-chat work lives
git checkout feat/song-chat-v2-scaffold

# 5. Install everything the project needs (takes a couple minutes)
npm install
```

Then **add the secret keys**:

1. Peter sends you the **`.env.local`** file.
2. Put that file in the **root** of the `lovify-web2app` folder (same level as
   `package.json`). That's it.

> If you don't have `.env.local` yet, you can still run the app — the AI features
> (real song/image generation) just won't work, but the chat **screens, flow, and
> design all work** so you can do UI work right away. To create a starter file:
> `cp .env.example .env.local` (then fill it in later with Peter's values).

---

## 4. Run it (this is what you'll do every day)

```bash
npm run dev
```

Leave that running. Then open your browser to:

- **The demo song page (V2):** http://localhost:3000/offer/v2-chat
- The full funnel: http://localhost:3000/offer

`/offer/v2-chat` drops you **straight into the song chat** and resets every time
you reload — perfect for testing your changes. When you edit a file and save,
the page **updates automatically** (no need to restart).

To stop the server: click the Terminal and press `Ctrl + C`.

---

## 5. Where the song-page code lives (the map)

Everything for the song chat is under `src/components/onboarding/comeback1/`:

| File | What it is |
|---|---|
| **`OnboardingChat.tsx`** | ⭐ The song chat itself — the questions, bubbles, the whole conversation. **This is where you'll spend most of your time.** |
| `OnboardingComeback1Flow.tsx` | The "brain" that orchestrates the steps and kicks off song/image generation |
| `VibePicker.tsx` | The sound/genre picker with audio previews |
| `VoiceDump.tsx` | The "tap to talk" voice input |
| `screens.tsx` | The other funnel screens (paywall, etc.) |

Supporting code:

| File | What it is |
|---|---|
| `src/components/onboarding/v3/generation.ts` | Calls the AI (lyrics, image, song, artist breakdown) |
| `src/components/onboarding/v3/theme.ts` | Colors, fonts (the `LOVIFY` palette) |
| `src/lib/chatVariant.ts` | The **v1 vs v2 A/B switch** (see Rules below) |
| `src/app/offer/v2-chat/page.tsx` | The test page route |
| `src/app/api/...` | The in-app AI endpoints (artist sound, vision scenes) |

**Read `AGENTS.md`** in the project root first — it's the short house-rules doc
for this codebase.

---

## 6. Make your first change (try it!)

1. In VS Code, open `src/components/onboarding/comeback1/OnboardingChat.tsx`.
2. Find a line of text the bot says (e.g. search for `First, what's your name?`).
3. Change the wording, **save**.
4. Look at http://localhost:3000/offer/v2-chat — it updates instantly. 🎉

Before you share work, run these two checks (both should pass with no errors):

```bash
npm run lint
npm run build
```

---

## 7. Save & share your work (Git basics)

When you've made changes you're happy with:

```bash
git checkout -b your-name/what-you-changed   # make your own branch
git add -A                                    # stage your changes
git commit -m "Short description of the change"
git push -u origin your-name/what-you-changed
```

Then open a **Pull Request** on GitHub (it'll show a button) so Peter can review.

> Prefer buttons over typing? VS Code's **Source Control** panel (the branch icon
> on the left) lets you stage, commit, and push with clicks.

---

## 8. The rules (please read 🙏)

1. **Don't touch the live funnel.** Anything under `/comeback1` is real,
   ad-traffic'd, and live. Your work is on **`/offer`** and **`/offer/v2-chat`**.
2. **The new song chat is "V2" and is OFF by default.** It only shows when the
   URL has `?chat=v2` (which `/offer/v2-chat` forces). Real visitors still see V1.
   So your changes are safe to experiment with — they won't hit live traffic
   until someone flips the switch in `src/lib/chatVariant.ts`.
3. **When editing a shared file, branch your code on `variant === 'v2'`** so V1
   stays untouched. (Ask Peter or look at existing examples — most V2 changes in
   `OnboardingChat.tsx` are already written this way.)
4. **Both `npm run lint` and `npm run build` must pass** before a PR.

---

## 9. All the links in one place 🔗

| Service | Link | What it's for |
|---|---|---|
| **Code (GitHub)** | https://github.com/peterkell1/lovify-web2app | The codebase |
| **Live demo** | https://demo.trylovify.com/offer | The funnel in production |
| **Song page (V2)** | https://demo.trylovify.com/offer/v2-chat | The page you're working on |
| **Vercel** | https://vercel.com | Hosting + auto-deploys + env vars |
| **Supabase** | https://supabase.com/dashboard | Database + backend (project: Lovify-dev) |
| **PostHog** | https://us.posthog.com | Analytics / funnel metrics |
| **RevenueCat** | https://app.revenuecat.com | Subscriptions / billing |
| **Anthropic** | https://console.anthropic.com | The AI (Claude) the song chat uses |

---

## 10. Optional: Claude Code (AI pair-programmer)

You don't need it, but if you want an AI assistant *inside* your editor that can
make changes for you, you can install **Claude Code**: https://claude.com/code
(works in the terminal or as a VS Code extension). Totally optional — everything
above works in plain VS Code.

---

## 11. Stuck? Quick fixes

- **`npm run dev` errors about a missing variable** → you don't have `.env.local`
  yet, or it's incomplete. Ask Peter.
- **Page is blank / won't load** → make sure `npm run dev` is still running in
  Terminal, and you're on `http://localhost:3000` (not https).
- **`command not found: npm`** → Node didn't install correctly; reinstall from
  https://nodejs.org and restart Terminal.
- **Anything else** → ask Peter, or paste the error to Claude.

Welcome aboard! 🎶
