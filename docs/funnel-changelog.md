# Comeback funnel — change log & conversion tracking

Live funnel: **https://demo.trylovify.com/comeback1** (the production Meta-ads landing page).

This doc is the single place to answer: *"What did we change, when, and did it move conversion?"*
The numbers live in PostHog (no manual entry); this doc records the **changes + hypotheses + the
verdict** so we can correlate the two.

---

## Where the numbers live (PostHog project 404083)

| View | What it shows | Link |
| --- | --- | --- |
| **Dashboard: Comeback funnel — daily CR & change log** | Everything below, in one place (pinned) | https://us.posthog.com/project/404083/dashboard/1711933 |
| Daily CR by step (table) | Per-day: landed_raw, **engaged**, paywall, checkout, purchased, % | https://us.posthog.com/project/404083/insights/6CkMTo5M |
| Daily funnel volume (trend) | engaged → paywall → checkout → purchased lines, with deploy markers | https://us.posthog.com/project/404083/insights/fpRBD1WA |
| Every-screen funnel (28 steps) | Step-by-step drop-off; **break down by `utm_content`** to compare ads | https://us.posthog.com/project/404083/insights/3LO5Atjn |
| Session replays | Watch real users; filter entry URL contains `comeback1` | https://us.posthog.com/project/404083/replay |

**Deploy markers:** every change is logged as a PostHog **annotation** (the emoji flags on the trend
charts), so you can literally see the line move after a deploy. Add a new one each ship:
PostHog → any insight → the calendar/annotation control, or ask Claude to create it.

### Read the metrics correctly (important)
- **`engaged` is the true visitor count, not `landed_raw`.** `engaged` = reached screen 2 ("Imagine a
  drug"), which requires a real tap. `funnel_landed` / `landed_raw` is inflated by Meta's prefetch
  bots (fixed going forward on 2026-06-12, but historical days are bot-heavy — e.g. 2026-06-12 shows
  394 landed vs 37 engaged). Always judge conversion off `engaged`.
- **Small numbers swing wildly.** With <50 visitors/day a single purchase moves the % a lot. Trust
  trends over several days, and the *engaged → paywall* rate first (it accumulates fastest).
- **Exclude internal/test traffic** with the dashboard's "Filter out internal and test users" toggle.
- The RevenueCat checkout (`pay.rev.cat`) is off-domain — we can't record those ~30s; a drop between
  `checkout_started` and `purchase_completed` = card-form abandonment.

### Funnel events (fired client-side, sliced by `utm_content` = ad)
`funnel_landed` → per-screen `onboarding_step_viewed{step_id}` → `paywall_viewed` →
`checkout_started` → `purchase_completed{value,currency}`. Value-bridge experiment adds
`value_bridge_shown`, `value_bridge_completed`, `paywall_song_played`.

---

## How to verify the funnel still works (after any deploy)
1. Open `https://demo.trylovify.com/comeback1?x=1` on a phone; walk it end to end (name → song →
   Save → value bridge → paywall). Confirm a song generates and plays.
2. PostHog **Activity** → confirm `funnel_landed` + `onboarding_step_viewed` arriving with `utm_*`.
3. Do a $1 test purchase → confirm ONE deduped Meta `Purchase` + PostHog `purchase_completed`, the
   set-password email, app sign-in, and the song present.
4. Glance at the **Daily CR** table — today's `engaged`/`paywall`/`checkout` should be non-zero.

---

## Change log

Newest first. **Effect** = the read once ≥3 days of post-deploy traffic exist (until then: *watching*).

| Date | PR | Area | Change | Hypothesis | Effect |
| --- | --- | --- | --- | --- | --- |
| 2026-06-14 | #36 | Song→paywall | **Value bridge** (yes-ladder after Save) + **playable song through the paywall** | Warming users before the paywall + keeping the song audible lifts song→checkout | _watching_ |
| 2026-06-13 | #35 | Reveal/mic | Mic hidden on iOS, Save button highlight, faster song playback (pre-buffer), vision 3× retry | Remove "nothing happens" dead-ends at the reveal | _watching_ |
| 2026-06-13 | #34 | Chat | Keyboard no longer hides the question being answered | Fewer abandons while typing answers | _watching_ |
| 2026-06-13 | #33 | Branding | Heart favicon + OG share image (was default Vercel icon) | Better link shares / trust | n/a (not CR) |
| 2026-06-13 | #31–32 | Perf | Images 90% smaller (WebP) + pill shows instantly on screen 2 | Faster load → fewer first-screen bounces | _watching_ |
| 2026-06-13 | #28–30 | Demo | Demo "tap to play" prompt, "this is just an example" framing, real play icon | Fix the demo-chat drop-off (people stalled at "Save Song") | _watching_ |
| 2026-06-12 | #27 | Tracking | **PostHog prefetch fix** — stop counting Meta bot prefetches as landings | Make step-1 counts ≈ real clicks (measurement, not CR) | ✅ landed_raw now realistic |
| 2026-06-11 | #21 | Fulfillment | Real App Store link on thank-you page; song audio re-hosted (iOS playback) | Buyers can actually download + play | ✅ playback fixed |
| 2026-06-10 | #13–25 | Funnel | **comeback1 dream-interview funnel live** — Q1 vision/vent, flipped-positive chips, personalized visions, supportive reflection, removed comeback-method screen | The core funnel rebuild | baseline |
| 2026-06-10 | #6–12 | Setup | comeback1 funnel cloned from v3; PostHog + Meta pixel wired; prod RC token | Stand up the ad funnel | baseline |

When you ship the next change, add a row here **and** drop a PostHog annotation on the same date.

---

## Snapshot — first days (engaged = real visitors)

Recorded 2026-06-14; the live numbers are always in the [daily table](https://us.posthog.com/project/404083/insights/6CkMTo5M).

| Day | engaged | paywall | checkout | purchased | visitor→purchase |
| --- | --- | --- | --- | --- | --- |
| 2026-06-11 | 9 | 5 | 5 | 3 | 33% (tiny n) |
| 2026-06-12 | 37 | 7 | 4 | 2 | 5.4% |
| 2026-06-13 | 68 | 15 | 6 | 3 | 4.4% |
| 2026-06-14 | 33+ | 14 | 6 | 2 | ~6% (in progress) |

Early signal: the funnel converts once people engage; the leverage is **traffic volume + the
song→paywall bridge** (PR #36), not the funnel mechanics.
