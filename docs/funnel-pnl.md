# Comeback funnel — daily P&L

Daily profit & loss for the **demo.trylovify.com/comeback1** Meta-ads funnel: ad spend vs revenue.
Pairs with [funnel-changelog.md](./funnel-changelog.md) (the CR side) and the PostHog dashboard.

## Data sources (how each column is pulled)
- **Ad spend** — Meta ad account `1571804544334404` ("Nitido - 13715 - Lovify 01"), daily, USD.
- **Trials** — PostHog `purchase_completed` count/day (project 404083) = web-funnel $1 trials started.
- **Revenue (cash)** — RevenueCat project `proj58fde63b` (`get-revenue-metric`). ⚠️ This figure is
  **all RevenueCat apps**, not web-only, so it slightly overstates funnel revenue — but it's already
  far below spend, so the conclusion holds.
- Spend lives in Meta, not PostHog, so this P&L's home is this doc. Ask Claude to refresh it (it
  pulls Meta + RevenueCat + PostHog), or update the rows by hand from Ads Manager + the RC dashboard.

## ⚠️ Read this before reacting to the numbers
The product is a **$1 trial → $89.99/year** (billed at day 7). So **same-day cash is tiny ($1 ×
trials); the real revenue lands ~7 days later** when trials convert. A daily cash P&L will always
look ugly on the spend day. The number that decides profitability is **CAC vs annual value**:
- Annual value ≈ **$89.99** (first year, if they don't cancel).
- Breakeven CAC ≈ `$89.99 × (trial→paid conversion %)`. At a typical ~50–60% trial conversion,
  **breakeven CAC ≈ $45–54 per trial.**

## Daily table

| Date | Ad spend | Clicks | Trials | CAC / trial | Same-day cash | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-10 | $5.77 | 4 | 0 | — | $0 | funnel soft-launch |
| 2026-06-11 | $344.84 | 234 | 3 | **$114.95** | $3 | scale-up begins |
| 2026-06-12 | $392.72 | 235 | 2 | **$196.36** | $2 | (lots of bot prefetch this day) |
| 2026-06-13 | $273.63 | 129 | 3 | **$91.21** | $3 | |
| 2026-06-14 | $247.49 | 125 | 2 | **$123.75** | $2 | value-bridge shipped (PR #36) |

**Spend 6/11–6/14:** $1,258.68 · **Trials:** 10 · **Blended CAC:** **~$125.87/trial**
**RevenueCat revenue (cash, all apps):** $41.98 (6/11–13) · $176.18 (6/8–14 week)

## Verdict (be honest)
**The funnel is deeply unprofitable right now.** Blended CAC is **~$126 per trial** — and even if
**every** trial converted to the full $89.99 annual (they won't), that's still **underwater on
year-1** ($126 cost > $90 revenue). Week net (cash): ≈ **−$1,090**.

This isn't a tracking problem — it's the core economics. Two levers, both of which the recent work
targets:
1. **Lower CAC.** CAC = CPC ÷ (visitor→purchase CR). The CR is ~4–6% once people engage; the bigger
   bleed is cheap top-of-funnel (first-screen bounce) and expensive clicks. Every CR win
   (value bridge PR #36, faster load, demo fixes) lowers CAC directly.
2. **Raise revenue per buyer.** Test **annual-up-front** ("get your song now — $X/year") alongside
   the $1 trial so committed buyers pay the full year on day 0 instead of a $1 trial that may churn.

**Target to watch:** drive blended CAC from ~$126 toward **< ~$45** (or lift CR ~3×). Until CAC <
breakeven, scaling spend scales losses.

## How to update (daily)
Ask Claude: *"refresh the daily P&L"* — it pulls:
- Meta spend: `ads_get_ad_entities` (account `1571804544334404`, `level=account`, `fields=[spend,clicks]`, `time_increment=1`).
- Trials: PostHog `purchase_completed` by day (HogQL).
- Revenue: RevenueCat `get-revenue-metric` (project `proj58fde63b`).
…then append the new rows here and update the blended CAC + verdict. (A scheduled agent can do this
automatically every morning — ask to set it up.)
