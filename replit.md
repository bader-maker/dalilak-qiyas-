# دليلك إلى قياس — Saudi Exam Prep

Next.js 15.3.7 (App Router, Turbopack) · Bun · TypeScript · Supabase · Tailwind. Arabic-first / RTL, Tajawal font. Brand colors: `#006C35` (green) and `#D4AF37` (gold).

Dev server runs on port 5000 via the `Start application` workflow:

```
bun run dev -- -p 5000
```

## Architecture notes

- **Practice flow** (`src/app/practice/test/page.tsx`): self-paced training, 90-second per-question timer, hint reveal, explanation reveal, and "تدرب على نفس النمط" (practice similar) in-session insertion.
- **Non-Qudrat practice picker** (added 2026-04-25, `src/app/practice/page.tsx`): GAT / Tahsili-AR / SAAT-EN now render a minimal subject/section selection page on `/practice?focus=<value>` instead of auto-redirecting straight into a session. The picker is driven by a single `NON_QUDRAT_GROUPS` constant (the source of truth for which focus values trigger the branch — adding a new exam-bank subject = add a row): GAT → Quantitative/Verbal; Tahsili → Math/Physics/Chemistry/Biology (Arabic, RTL); SAAT → Math/Physics/Chemistry/Biology (English, LTR). Initial subject defaults to whichever `?focus=` value the dashboard sent; switching tabs updates state without leaving the page; clicking Start navigates to `/practice/test?focus=<currentSubject.focus>&count=<n>&difficulty=<d>`. The legacy auto-redirect `useEffect` is **retained ONLY** for Qudrat-AR with a non-empty validated `?topics=` deep-link (the personalization path from result pages — without it, weak-topic hints would be silently dropped at the topic picker). All other focus values fall through to either this picker (non-Qudrat) or the original Qudrat-AR topic-grid flow (`focus=quantitative_ar`/`verbal_ar` without topics, or no focus at all). TestEngine, `/practice/test`, `/test/*` pages, exam-config, and the dashboard are unaffected.
- **Bilingual per-question analysis fields** (added 2026-04-25, `src/lib/trainingEngine.ts` + `src/app/practice/test/page.tsx`): `idea`, `fast_method`, `why_important`, `hint`, `common_mistake`, `reinforcement` on `TrainingQuestion` now use a `Localized = string | Bilingual` type, where `Bilingual = { ar: string; en?: string }`. The in-app enrichment pipeline (branch metadata, `deriveSmartInfo` per-question templates, hint/mistake/reinforcement dictionaries) emits `{ ar, en }` so GAT-EN / SAAT-EN questions get English analysis chrome from the same code path that serves Qudrat-AR; English regex alternates were added so derivation hits English question text (`x + a = b`, `square with side N`, `N% of M`, mean/median/range/probability, etc.). The five render sites in the explanation panel route every analysis field through a tiny `pickLocale(value)` helper that returns plain strings as-is, picks the matching locale for `{ar,en}`, and silently falls back to `ar` when `en` is missing — so legacy Arabic-only data and partial English coverage never produce blank panels. Source `explanation` text is per-language and stays unchanged. TestEngine, question selection logic, and UI layout were not modified.

- **Practice/test return path + bilingual chrome** (added 2026-04-25, `src/app/practice/test/page.tsx`): two fixes layered on top of the same exam-locale derivation, no TestEngine changes.
  - **Return-to-source**: the results-screen "Back to Training" button and the header back-chevron previously hard-coded `router.push("/practice")`, dumping every category's session into the Qudrat picker. Both now route to a single `backToTrainingHref` derived from the validated `focus` query param: `focus` set → `/practice?focus=<focus>`, `focus` null → `/practice`. The picker page already pre-selects the matching tab in both modes (`focusToSection` for Qudrat-AR; `NON_QUDRAT_GROUPS` for GAT/Tahsili/SAAT), so no extra state needs to be threaded. The auto-redirect on `/practice` only fires for Qudrat-AR with `?topics=` (the deep-link personalization path), so this URL never re-launches a session — the user always lands on the picker.
  - **Bilingual results + test chrome**: when the exam is English (focus suffix `_en` → GAT-EN / SAAT-EN) the loading state, results screen, header, difficulty pill, hint card, three-column analysis, explanation, and "Next / Show Results" / "Practice Same Pattern" buttons render in English with `dir="ltr"` and `text-left`; option-label chips switch from `["أ","ب","ج","د",...]` to `["A","B","C","D",...]` and the option text uses LTR + left-aligned. When the exam is Arabic (`_ar` suffix or no focus → Qudrat-AR / Tahsili-AR) the original Arabic + RTL behavior is preserved exactly. A tiny inline `tx(ar, en)` helper localizes strings inline at their use-site (no separate i18n file for ~14 strings); `examDir` / `examTextAlign` / `optionLabels` are derived from a single `isArabicExam` flag. Question text and option content come straight from the data files, so they remain in their natural language (English for GAT/SAAT data, Arabic for Qudrat/Tahsili data) — only the surrounding chrome localizes. The header chevron also flips direction (left in LTR, right in RTL) so it always points back toward the line start. The section-color check (`section === "كمي"`) is intentionally untouched — non-Qudrat sections (`"GAT"`, `"تحصيلي"`, `"SAAT"`) fall through to the amber styling, which is the correct behavior.
- **Adaptive difficulty** (`src/lib/adaptiveDifficulty.ts`): re-ranks the upcoming slice every 5 answered questions so the next batch favors the difficulty that matches the student's current performance, using a 70/30 mix (target tier / other tiers). The adaptive effect is gated by:
  - identity-based session detection (`lastSessionRef`) so `practiceSimilar` inserts don't restart adaptation, and
  - a milestone guard (`lastAdaptedAtRef`) so each multiple-of-5 boundary only fires once.
- **Adaptive signals** (added 2026-04-24): in addition to overall accuracy, `summarizePerformance` accepts optional per-question `times` (seconds spent) and `hints` (boolean revealed flag) arrays. Over the most recent window it derives:
  - `fastWrongRate` ≥ 0.4 → step easier ("guessing under time pressure"),
  - `hintRate` ≥ 0.4 → step easier ("relying on hints"),
  - `fastCorrectRate` ≥ 0.6 → step harder ("mastering quickly — push faster"),
  - `slowCorrectRate` ≥ 0.5 with base = hard and `fastCorrectRate` < 0.4 → step easier to medium ("understands but slow"). Adjustments are clamped to ±2 steps and only fire when ≥3 samples are in the window. Signal arrays are optional, so omitting them reproduces the original accuracy-only behavior.
  Speed thresholds (`FAST_SECONDS=15`, `SLOW_SECONDS=45`) are tuned to the practice page's 90-second timer and exported for future tuning.
- **Profile-bias adaptive difficulty** (added 2026-04-24): `summarizePerformance` now also accepts an optional `profileBias?: { lastKnownLevel?: "weak"|"developing"|"strong"; trend?: "improving"|"declining"|"stable" }` resolved by the caller from the persistent profile timeline. The helper itself stays pure (no `userProfile` import). Two rules, both gated on the same `window.length >= 3` check used by session signals:
  - **Trend** (the explicit user spec): `declining` → -1 step (slow the climb / rebuild confidence); `improving` → +1 step (raise the ceiling sooner); `stable` → 0 (preserve current behavior).
  - **`lastKnownLevel` safety damper** — fires ONLY when session-derived `baseDifficulty` strongly disagrees with history. `base=hard` AND `level=weak` → -1; `base=easy` AND `level=strong` → +1; otherwise 0. Prevents an unrepresentative 5-question window from catapulting a historically-weak student straight to HARD (and vice-versa); silent in the common case where session and history agree.
  - **Bias-only / conflict resolution:** session and profile contributions are tracked SEPARATELY (`sessionAdjustment` + `profileAdjustment`, both exposed on `Performance` for auditability). Before the existing `[-2, +2]` shared clamp, a non-override cap is applied to the combined sum that **preserves the sign of the session adjustment whenever it has one**: if `sessionAdjustment > 0` (session wants harder), profile may amplify or attenuate toward 0 but the net is floored at 0 — profile can never flip "harder" into "easier"; symmetrically when `sessionAdjustment < 0` the net is capped at 0. Profile applies in full only when `sessionAdjustment === 0` (session is genuinely neutral and profile fills the vacuum). Concretely: session=+1 + profile=-2 → net=0 (sign preserved); session=-2 + profile=+1 → net=-1 (amplification still allowed); session=0 + profile=-1 → net=-1 (free path).
  - **Wired at:** the practice-page adaptive effect (`src/app/practice/test/page.tsx`) resolves a single "topic of interest" before each call (focused topic when `requestedTopics.length === 1`, otherwise the modal topic over the recent answered window), then reads `profile.lastKnownLevel?.[topic]?.level` and `getTopicImprovement(profile, topic)?.trend`. Wrapped in try/catch so a corrupt profile blob can never break adaptation — it falls back to session-only signals (the prior behavior).
- **Full exams** (`src/components/TestEngine.tsx`, `/test`, `/test-gat`) use a separate engine and are intentionally NOT touched by the practice-page adaptive logic.
- **Standardized test sizing** (added 2026-04-25, hardened same day): `TestEngine` exposes a single `TEST_RULES` object at the top of the file: `COMPREHENSIVE = {questions: 120, time: 120}`, `SECTION = {questions: 25, time: 25}`. `getTestParameters` resolves to those defaults for every category (Qudrat / GAT / Tahsili / SAAT) — per-exam values from `examCategories[...].totalQuestions` / `getSectionConfig(...)` are intentionally NOT consulted. Caller-supplied `questionLimit` / `timeLimit` props still override (used by `/test-saat` and `/test-tahsili` trial pages → 40/60). Hardening: question count is clipped to actual pool size (`Math.min`), timer is held to a 1-min-per-question floor (`Math.max`), `testMode="section"` without `selectedSection` falls back to a 25/25 comprehensive test (with a dev `console.warn`), and a `[TestEngine]` dev-only `console.log` reports the resolved params + override source on every initialization. Practice / training (`/practice/test/page.tsx`) does NOT use TestEngine and is unaffected.

- **Route-aware sidebar + section anchors** (added 2026-04-25, `src/components/DashboardView.tsx` + `src/app/landing/page.tsx`): the dashboard sidebar is now derived from `lockedExamType`. On `/qudrat` it renders **الرئيسية → #overview, التقدم → #progress, كمي → /practice?focus=quantitative_ar, لفظي → /practice?focus=verbal_ar, تدريب → /practice, بنك الاختبارات → #test-bank**, with **الاشتراكات → /subscriptions** and **الدعم الفني → mailto:support@dalilqiyas.sa** pinned at the bottom of the nav (the support route doesn't exist yet so the mailto is a non-breaking placeholder pointing at the same support address already published in the landing footer). On `/tahsili` it renders **الرئيسية → #overview, التقدم → #progress, التدريب → /practice?focus=math_ar, بنك الاختبارات → #test-bank** + the same bottom pair. The legacy unlocked `/dashboard` view keeps its original cross-product items (Aptitude / Achievement / Practice / Profile) so it isn't broken. Section IDs `id="overview"`, `id="progress"`, `id="practice"`, and `id="test-bank"` were added to their respective dashboard sections (with `scroll-mt-20` so the sticky header doesn't cover the anchor target). كمي/لفظي deep-link into `practice/page.tsx`'s existing `focus` query-param handler — no new logic; the practice page already maps `quantitative_ar`/`verbal_ar` (Qudrat) and `math_ar`/etc. (Tahsili picker). The desktop sidebar stays right-pinned in RTL / left-pinned in LTR; the mobile-only `/qudrat ↔ /tahsili` route switcher above the banner is preserved. **Landing page entry**: `src/app/landing/page.tsx` — the four "main categories" cards (القدرات / التحصيلي / القدرات العامة / GAT English) are now `<Link>`s wired to `/qudrat`, `/tahsili`, `/qudrat`, `/qudrat` respectively so the landing page is the main entry into the product routes (no `/dashboard` intermediary). The hero CTAs continue to route through `/login` for auth — backward-compatible. **No core logic changed**: TestEngine, practice/test logic, AI/API logic, subscription bundle logic, and brand colors/copy were not modified.

- **Dashboard section-based layout** (added 2026-04-25, `src/components/DashboardView.tsx`): the `/qudrat` and `/tahsili` dashboard body is organized into 8 explicit, independently-carded sections in this fixed order — **(1) Banner** (existing green Subscribe CTA), **(2) Tabs** (welcome greeting + Overview/Progress `dashboardView` toggle, wrapped in a standard card), **(3) Exam Context Card** (single white card containing both Aptitude/Achievement chooser groups; the two original per-group cards are kept verbatim inside, only the outer wrapper is new), **(4) Hero (AI / Catbot)** = Free Trial Test (centered green-gradient hero, `text-center` / `flex-col items-center` / `justify-center`, no `ms-auto` on the CTA so it sits centered), **(5) Progress** (Progress + Leaderboard 2-column grid), **(6) Tasks** = Practice Mode gold-gradient CTA, **(7) Practice** = Test Bank wrapped in white card, **(8) Reports** = Performance Analysis (relocated from above the Hero to the bottom). The pre-existing Features grid remains as a 9th row below Reports (kept to honor "do NOT remove any content"). Section card style is uniform: `bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 transition-colors duration-300`; gradient hero/task cards keep their own brand surfaces (`from-[#006C35] to-[#00A651]` for Hero, `from-[#D4AF37] to-[#E8C547]` for Tasks) but match the same `rounded-2xl p-6 mb-6` rhythm. The `dashboardView === "progress"` branch is preserved verbatim and its `<ProgressCharts>` payload is now also wrapped in the same standard card. No state, handlers, routing, brand colors, copy, or content were changed — purely structural reorganization (8 wrapping cards + reorder of Free Trial Test up to the Hero slot and Performance Analysis down to the Reports slot) + uniform spacing.

## Persistent user profile

Long-running, cross-session aggregate of the student's practice performance, stored under the `user_profile` localStorage key (separate from `TrainingContext`'s per-question history under `dalilak_training_state`).

- **Module:** `src/lib/userProfile.ts` (pure data layer — SSR-safe, corruption-safe, versioned).
- **Stored:** raw counters (totals + per-topic counters: `answered`, `correct`, `timeSeconds`, `timedAnswered`, `hintsUsed`) plus `version`, `updatedAt`, `sessionsCompleted`, plus an optional `diagnostic` snapshot (see below). Storing counters (not pre-computed rates) means future signal additions don't require migrating historical data.
- **Updated (session signal):** at practice-session end — `applySessionToProfile(loadUserProfile(), payload)` then `saveUserProfile(...)`. A ref-based guard ensures one save per session reference; on transient storage failure the guard stays clear so the next re-render retries. The aggregator spreads the previous profile so the optional `diagnostic` field is preserved across session writes.
- **Updated (diagnostic signal):** at full-exam end — `applyDiagnosticToProfile(loadUserProfile(), input)` then `saveUserProfile(...)` is called from the same effect that writes to `examHistory.ts`, in all three full-exam result paths (`src/components/TestEngine.tsx`, `src/app/test/page.tsx`, `src/app/test-gat/page.tsx`). The snapshot replaces any prior diagnostic on each new exam (per-attempt history still lives in `qiyas_full_exam_history_v1`). The snapshot derives, from the same `categoryPerformance` payload examHistory receives: `weakestTopics`, `strongestTopics`, `weakestSections`, `strongestSections` (each capped at 3, deterministic alphabetical tiebreakers), plus `overallScore`, `avgTimePerQuestion`, `examKind`, `takenAt`, and `source: "diagnostic"`.
- **Derived signals (`summarizeProfile`):** strongest topics (top 3 by accuracy with ≥5 answered), weakest topics (bottom 3 same gating), average accuracy, average speed (seconds per timed answer), hint usage rate.
- **Recommendations (`getStudyRecommendations`):** priority order — (1) diagnostic snapshot wins when present (`source: "diagnostic"`, recommended difficulty derived from `overallScore`), (2) session-derived weak topics with the existing `≥1 session AND ≥5 answers` gate (`source: "sessions"`), (3) empty defaults (`source: "none"`). All three paths agree on the same `<50 / 50–80 / >80` accuracy boundaries used by the per-session adaptive engine.
- **Practice topic selection:** in the focus branch of `src/app/practice/test/page.tsx`, when no `?topics=` URL param is supplied, the loader consults the persistent profile in two ordered passes — (a) cross-session reinforcement candidates from `getReinforcementTopics(profile)`, then (b) diagnostic-driven recommendations from `getStudyRecommendations(profile)`. Both lists are filtered to slugs present in the current section's pool (Arabic/English labels resolved via `categoryNameToSlug`), then merged reinforcement-first / dedup / capped at 3 to feed the existing 4-tier prioritization (matching-fresh → matching-stale → other-fresh → other-stale). When neither pass produces a usable topic, or the URL `?topics=` is supplied explicitly, behavior is unchanged.
- **Cross-session reinforcement** (added 2026-04-24, `getReinforcementTopics(profile, n=TOP_N)` in `src/lib/userProfile.ts`): scans `topicProgress` for topics that need to be repeated next session. Two reasons trigger candidacy, both derived from session-source snapshots only (diagnostic / exam events fire too rarely to drive a per-session decision):
  - **`declining`** — with ≥3 session snapshots, the last two transitions are both negative (S3<S2 AND S2<S1) OR the net 2-session change is a drop of ≥ `PROGRESS_TREND_THRESHOLD` (S3 − S1 ≤ −5). With exactly 2 session snapshots, a single significant drop (S2 − S1 ≤ −5) qualifies — we don't wait another session before reacting.
  - **`weak-no-improvement`** — latest two session snapshots both at `weak` level (accuracy < 50) AND streak ≥ 1, so a brand-new weak datapoint doesn't trigger reinforcement.
  - **Repeat until improvement detected:** each candidate carries a `reinforcementStreak` = consecutive recent session snapshots without an improvement step (positive accuracy delta ≥ `PROGRESS_TREND_THRESHOLD`). The streak persists across sessions implicitly via the timeline — no extra storage / no migration. As long as the streak is below the cap, the topic stays prioritized in the next session; the first improving snapshot resets the streak to 0. An explicit `streak === 0` short-circuit before the decline rules guarantees that a recent improvement step drops the topic from candidacy even when an older dip would otherwise satisfy the net-drop branch (V-shape rebound case, e.g. S1=90, S2=20, S3=30 — net drop of −60 but +10 latest step → drop).
  - **No infinite repetition:** hard cap `MAX_REINFORCEMENT_STREAK = 3` (≈30+ targeted questions). Once a topic's streak reaches the cap it is dropped from candidacy and normal selection (diagnostic recommendations / weak-topic priority) takes over for the next session, even if the topic hasn't improved. Rationale: 3 reinforced sessions without movement signals the student needs a different intervention (lesson, hint, AI coach), not more drills.
  - **Sort:** streak DESC (most stuck first), then `latestAccuracy` ASC (weakest first), then topic for deterministic tie-breaks. Capped at `n` (defaults to TOP_N = 3).
  - **Fallback chain preserved:** when reinforcement returns nothing, the existing diagnostic-recommendation path runs untouched; when both are empty, the original 2-tier fresh→stale order applies.

### Per-topic progress timeline (combines all three sources)

A single per-topic time-series is the substrate for "improvement over time" insights and for surfacing the **last known level per topic**. It deliberately combines three feeds so trend analysis isn't dependent on any one source.

- **Storage:** two new optional fields on the same `user_profile` blob (version stays 1 — additive, backward-compatible with existing v1 profiles): `topicProgress: Record<topic, TopicProgressPoint[]>` and `lastKnownLevel: Record<topic, TopicLevel>`. Each timeline is sorted ascending by `at` and capped at `MAX_TOPIC_HISTORY = 30` points (oldest dropped first). `lastKnownLevel` is **always recomputed** from the head of the timeline at write/load time so the two structures cannot drift.
- **Combine:** topic keys are normalized via `categoryNameToSlug` so an exam's `"الجبر"` and a session's `"algebra"` fold into one series. Three feeds populate it:
  1. **Diagnostic** — `applyDiagnosticToProfile()` automatically emits one timeline point per category at `takenAt` (source: `"diagnostic"`).
  2. **Sessions** — `applySessionToProfile()` automatically emits one point per topic with `≥ MIN_SESSION_SAMPLES_FOR_SNAPSHOT = 3` answers in that session (source: `"session"`, with `sampleSize` recorded).
  3. **Previous exams** — `reconcileExamHistoryToProfile(profile, history)` ingests every entry from `examHistory.ts` (source: `"exam"`). It is **idempotent by `(at, source)`** so calling it on every page load is cheap — only genuinely-new pairs grow the series.
- **Wired at:** the three full-exam result effects (`TestEngine`, `/test`, `/test-gat`) call the reconciler right after their existing diagnostic save so the just-written exam history immediately contributes. The practice page's focus branch also reconciles when it loads the profile for recommendations (so historical attempts inform today's training even if the student hasn't taken a new exam since the feature shipped).
- **Improvement tracking:** `getTopicImprovement(profile, topic)` returns `{first, latest, deltaPct, trend, sampleCount}`, gated to topics with ≥2 snapshots. Trend uses the same `±5` percentage-point threshold as `examHistory.summarizeProgress` so the two systems describe the same change consistently. `getMostImproved(profile, n=3)` and `getMostDeclined(profile, n=3)` rank topics by signed delta with deterministic alphabetical tiebreakers. `getProgressInsights(profile)` is the one-call summary (`{mostImproved, mostDeclined, lastKnownLevels, topicsTracked, hasTrendData}`) for any future insights surface or smarter recommendation logic.
- **Coercion:** corrupt `topicProgress` blobs are dropped (rest of profile preserved). Within a series, individual invalid points are dropped while valid siblings survive — accuracies are clamped 0–100, sources outside `"diagnostic"|"session"|"exam"` rejected. `lastKnownLevel` is never read from the raw blob; always recomputed from the surviving timeline.

### Subtype-aware question selection

A *finer grain* than topic — e.g. topic `algebra` → subtype `quadratic` / `linear` / `logarithm` — is now inferred per question and threaded through both the in-session diversifier and the long-running profile counters. Strictly **additive**: every consumer treats absence as "no subtype" and falls back to topic-level behavior, so a future change to the inference rules (or removing them entirely) cannot break an existing flow.

- **Inference:** centralized in `src/lib/subtypeInference.ts`. A single pure helper `inferSubtype(text, topic)` covers Arabic + English wordings for the same skill so both languages bucket together. Patterns are deliberately coarse (≤ 8 subtypes per topic) — over-splitting would leave every bucket below the existing `TOPIC_MIN_SAMPLES` floor and produce no signal. Returns `undefined` when nothing matches; callers omit the field rather than write a noisy "general" bucket.
- **Schema additions (additive, no migration):**
  - `Question.subtype?: string` on `src/data/types.ts` — never set in the raw bank data; populated at load time by the inference helper.
  - `SubtypeCounters` and `TopicCounters.subtypes?: Record<string, SubtypeCounters>` on `src/lib/userProfile.ts` — nested under each topic so topic totals stay intact and consumers that don't read subtypes are unaffected.
  - `SessionAnswer.subtype?: string | null` — caller-supplied; omitted by older callers means the per-subtype bucket simply isn't updated for that answer, while topic totals still are.
- **Wired at:**
  - `loadExamBankQuestions()` in the practice page tags every exam-bank question (GAT-EN, Tahsili-AR, SAAT-EN) at load time, so the diversifier sees the slug from the first question of the very first session.
  - The Qudrat-AR in-file pool already gets `subtype` assigned by `enrichQuestion` → `deriveSmartInfo` (older logic that this work didn't touch). The `enrichQuestion` precedence preserves an explicit `q.subtype` if one is already set, so the two paths compose cleanly without double-assignment.
  - The session-end profile-save effect runs the central `inferSubtype` again per answered question and uses its result as the canonical persistent slug (falling back to `q.subtype` only when the central helper returns nothing). This unifies the per-subtype counter vocabulary across both pools — `deriveSmartInfo`'s richer "linear-add" / "circle-area" slugs power the in-session diversifier; the profile counters store the canonical "linear" / "area" buckets so totals across sessions remain comparable.
- **Aggregation:** `applySessionToProfile` now also bumps `topics[topic].subtypes[subtype]` whenever a non-empty subtype is provided, with the same correctness rules as topic counters (correct, hint, time only when the value is finite). Topic totals are always updated regardless — missing subtypes never leave the profile inconsistent.
- **Variety:** the existing `diversifyOrder` was strengthened with two new fallback tiers (subtype-only, then topic-only) so the no-consecutive-clustering guarantee holds even for exam-bank questions whose `strategy_tag` is undefined (`undefined !== undefined` is false). Earlier tiers are unchanged.
- **Read API:** `getTopicSubtypePerformance(profile, topic)` returns `{subtype, answered, correct, accuracy}[]` sorted weakest-first for any future subtype-aware UI / recommender. Returns `[]` when no subtype data exists, so callers fall back to topic-level signals.
- **Coercion:** `coerceSubtypeMap` and `coerceSubtypeCounters` defensively narrow corrupt blobs the same way the topic-level coercer does — bad keys/values are silently dropped, valid siblings survive, and the `subtypes` field is left `undefined` when the map ends up empty.

### Result-page progress card

A small additive card on the post-exam result screen surfaces the top mover in each direction, e.g. "تحسنت في الجبر بنسبة 50%" and "تراجع أداؤك في الهندسة بنسبة 30%". Strictly additive — same outer card style as the surrounding "Smart Insights" / "Question Summary" cards (`bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700`), green/red pills mirror the existing pill treatment.

- **Wired at:** all three full-exam result paths (`src/components/TestEngine.tsx`, `src/app/test/page.tsx`, `src/app/test-gat/page.tsx`). Inserted right BEFORE the existing "Question Summary" / "ملخص الإجابات" card.
- **State:** one new `progressInsightsCard` `useState` of `{improved: TopicImprovement|null, declined: TopicImprovement|null} | null`. Populated inside the EXISTING diagnostic-save effect, immediately after `reconcileExamHistoryToProfile + saveUserProfile`, by reading `getMostImproved(next, 1)[0]` and `getMostDeclined(next, 1)[0]` off the freshly-reconciled profile (no extra localStorage roundtrip).
- **Visibility gate:** the card mounts only when at least one of `improved.trend === "improving"` or `declined.trend === "declining"` — i.e. at least one topic crosses the same `±5pp` threshold the rest of the system uses. Each pill is independently gated, so improvement-only or decline-only cases render only the relevant pill. Empty profile / first-attempt → card is omitted.
- **Labels:** topic slugs are rendered through `slugToDisplayLabel(slug, "ar"|"en")` (added to `src/lib/topicMap.ts`), backed by `SLUG_TO_AR_LABEL`/`SLUG_TO_EN_LABEL` reverse maps for all 11 known slugs. Unknown slugs fall through to the raw string (resilient — never produces `undefined` or blank UI).
- **Bilingual:** `TestEngine` renders Arabic/English based on the existing `isArabic` flag; `/test` is Arabic-only; `/test-gat` is English-only — matching each surface's existing language convention.

## Conventions

- All UI strings are Arabic; layout is RTL by default. Use `dir="rtl"` and `unicodeBidi: "isolate"` when mixing numerals/Latin text inside Arabic strings.
- Brand colors are referenced as Tailwind arbitrary values (`text-[#006C35]`, `bg-[#D4AF37]/10`, etc.).
- Per-question signal state (`answers`, `times`, `hints`) MUST be kept index-parallel through every mutation — including the in-session `practiceSimilar` insertion and both session-build branches. The session-end profile-save effect relies on this.

## Practice module — STABLE (frozen 2026-04-25)

The Practice module (`/practice` picker + `/practice/test` engine) is considered stable and feature-frozen as of this date. No new features or debug toggles to be added without an explicit thaw. Bug fixes only.

- Category-specific picker for Qudrat / GAT / Tahsili / SAAT (`src/app/practice/page.tsx`) — `?focus=<value>` pre-selects the right tab via `focusToSection` (Qudrat) and `findGroupForFocus` (GAT/SAAT/Tahsili).
- Correct return-to-source navigation via `?focus=` (and the optional `?returnFocus=` override) — `backToTrainingHref` in `src/app/practice/test/page.tsx` is the single source of truth used by every back / "Back to Training" button. `Try Again` reloads the URL so focus is preserved.
- Bilingual UI and analysis throughout the in-test surface:
  - Qudrat / Tahsili → Arabic, RTL
  - GAT / SAAT → English, LTR
  - Bilingualized: 6 smart-analysis fields (`idea`, `fast_method`, `why_important`, `hint`, `common_mistake`, `reinforcement`) on `Bilingual = { ar; en? }` typed dictionaries, the `TestPatternIndicator` "Your test pattern" banner (label + explanation per pattern), and the `TrainingAICoachCard` chrome (title, loading, section labels, fallbacks).
  - Locale flag everywhere: `isArabicExam = focus === null || focus.endsWith("_ar")` is passed down as `isArabic` to both client-side cards.
- AI coach (`/api/ai-analysis`) supports lang-aware prompts and cache separation:
  - Request body now accepts `lang?: "ar" | "en"`.
  - 4 system-prompt variants: `SYSTEM_PROMPT_TRAINING` / `SYSTEM_PROMPT_TRAINING_EN` / `SYSTEM_PROMPT_FULL_EXAM` / `SYSTEM_PROMPT_FULL_EXAM_EN` selected by `pickSystemPrompt({examType, lang})`.
  - User prompt is fully translated for `lang === "en"` (labels, previous-exam block, JSON footer); JSON response schema is identical in both languages.
  - `hashKey` in `src/lib/aiAnalysis.ts` includes `lng: input.lang === "en" ? "en" : null` so undefined / "ar" callers keep matching legacy AR cache entries while English exams get a distinct cache slot — no AR/EN cross-contamination.
- TestEngine (`src/components/TestEngine.tsx`) untouched throughout this stabilization. Same for the dashboard, training engine, and the `/api/ai-analysis` auth + payload-cap + monthly quota guards.

## Dashboard chrome refactor (2026-04-25)

Refactored `/dashboard` chrome only — no logic, state, routing, or API changes. All existing sections (welcome + view toggle, exam type tabs, sub-type tabs, progress card, leaderboard, performance analysis, free trial test, practice mode, test bank with comprehensive + topic grids, features, ProgressCharts conditional view, Subscribe Modal, AIAssistant) are rendered unchanged inside the new shell.

- Background: `bg-[#F8FAF9]` (was `bg-gray-50`).
- New right-pinned 260px sidebar (`hidden lg:flex` — desktop only): logo + brand, nav links to existing routes (`/dashboard` active, `/practice`, `/subscriptions`, `/profile`), bottom theme toggle (reuses `toggleTheme`).
- New sticky white top header (`h-16`): page title "لوحة التحكم" / "Dashboard" (desktop) or compact mobile-only logo (< lg), mobile-only theme toggle (`lg:hidden` — preserves theme toggle access on small screens since the sidebar is hidden there), decorative notification bell (no behavior — visual chrome), avatar with the existing `showUserMenu` dropdown (Profile, Subscriptions, Sign Out — all preserved).
- Main content centered to `max-w-[1100px]` with `lg:mr-[260px]` (RTL) / `lg:ml-[260px]` (LTR) offset.
- The pre-refactor top-bar "اشترك الآن" / "Subscribe Now" button (which calls `goToTest`, not `openSubscribeModal` — pre-existing naming) was relocated into a new banner card at the top of main content; handler unchanged.
- Sidebar position and main offset mirror via `isEnglish` so GAT/SAAT bilingualization is not regressed; chrome strings (`Home/الرئيسية`, `Practice/التدريب`, etc.) bilingualized.
- Subscribe Modal and floating `AIAssistant` remain at the root level outside the main column wrapper.
- Skipped per scope: AI Hero block, AI input field, fabricated points/streak stats, "Invite friends" card, "Community" button — these would have been empty placeholders.

## Dashboard visual polish pass (2026-04-25)

Pure CSS/typography polish on top of the chrome refactor — zero logic, routing, state, handler, or feature changes. No JSX restructuring beyond two `aria-hidden` decorative blur divs in the banner.

- **Cards:** dropped `shadow-sm`, lightened light-mode borders to `border-gray-100` (dark mode → `border-gray-700/60`). Applied via `replace_all` across all white card variants and the test-bank tile grid.
- **Spacing rhythm:** normalized all top-level `mb-8` → `mb-6` (Progress grid, Performance, Free Trial, Practice Mode, Test Bank wrapper, Features grid).
- **Section titles:** the four h2s (Progress 📊, Leaderboard 🏆, Performance 📈, Test Bank 📚) now use a soft tinted icon chip (`w-9 h-9 rounded-xl bg-{brand}/10 dark:bg-{brand}/20`) instead of a bare `text-2xl` emoji span; title font normalized to `text-base font-bold`, gap-3, mb-5. Color: green tint for Progress/Performance, gold tint for Leaderboard/Test Bank.
- **Sidebar premium polish:** added uppercase eyebrow label "القائمة" / "Menu" above the nav; bumped padding to `px-4 py-6`; nav items wrapped in `space-y-1.5`; active item upgraded to `font-semibold` with `shadow-sm shadow-[#006C35]/30` for soft green glow; inactive items softened to `text-gray-600` with `hover:text-gray-900 hover:bg-gray-50`.
- **Banner:** new `bg-gradient-to-br from-[#006C35] via-[#007a3d] to-[#00A651]` with `shadow-[#006C35]/20`; replaced ⭐ emoji with a gold SVG star inside a `backdrop-blur` icon container with white ring; added two `aria-hidden` `pointer-events-none` decorative blur circles (top + bottom, mirrored via `isEnglish`); button enlarged with `ring-1 ring-[#D4AF37]/30`; mobile-first stacking via `flex-col sm:flex-row`.
- **RTL logical properties:** `mr-auto` → `ms-auto` on Free Trial and Practice Mode CTAs (proper "push to opposite end" in both directions); Subscribe Modal close button `right-4` → `end-4`.
- **Tailwind 3.4.17** is the project version, so `ms-auto`, `end-4`, and `dark:bg-X/20` opacity modifiers are all supported.

## Dashboard exam selection grouping (2026-04-25)

Reorganized the exam selection UI on `/dashboard` from a two-step flow (category → variant) into two side-by-side grouped cards. **Zero changes to state model, routing, handlers, TestEngine, practice/test logic, or downstream consumers** — only the selection UI markup at lines ~660-737 was replaced.

- **Aptitude Tests card** (`اختبارات القدرات`, 🧠 green chip): contains pills `القدرات العامة` (Qudrat) and `GAT`. Each pill onClick atomically sets `setExamType('qudurat')` + `setQuduratType('general'|'gat')`.
- **Achievement Tests card** (`اختبارات التحصيلي`, 🎓 gold chip): contains pills `التحصيلي` (Tahsili) and `SAAT`. Each pill atomically sets `setExamType('tahsili')` + `setTahsiliType('tahsili'|'saat')`.
- **Group highlight**: the card whose `examType` matches the active selection gets `border-2 border-[#006C35] shadow-sm shadow-[#006C35]/10`; the other group keeps the neutral light border.
- **Pill active state**: gold (`bg-[#D4AF37] text-black`) when the (examType, subtype) tuple matches; otherwise neutral gray.
- **Layout**: `grid grid-cols-1 md:grid-cols-2 gap-4 mb-6` — stacks on mobile, side-by-side from `md` breakpoint. Both groups visible at all times in RTL.
- **Routing/data unchanged**: `getCurrentProgress`, `getCurrentPerformance`, `getCurrentLeaderboard`, `isEnglish`, `practiceHref`, the Free Trial Start Test href ternary, Test Bank conditionals (`{examType === 'qudurat' && ...}` / `{examType === 'tahsili' && ...}`), and all `*FreeTest` / `*Topics` / `*ComprehensiveTests` lookups all read from the same state and continue to work without modification.
- **Behavior note**: previously switching category preserved the last sub-selection; now every pill click is explicit (clicking GAT always lands on `(qudurat, gat)`). This is appropriate since both groups are visible simultaneously — no hidden memory state needed.

## Subscriptions page exam grouping (2026-04-25)

Applied the dashboard's two-group concept (Aptitude/Achievement) to `/subscriptions` — but only as **internal restructure of each existing plan card's body**. Billing model is unchanged: still two bundle plans, Arabic (Qudrat+Tahsili) and English (GAT+SAAT). User explicitly chose this approach over duplicating cards or splitting into 4 fake plans.

- **Inside each plan card body**, replaced the flat features `<ul>` with three blocks:
  1. **Aptitude sub-section** (green icon chip 🧠 matching dashboard): one bullet for the relevant aptitude exam (Qudrat in Arabic card, GAT in English card).
  2. **Achievement sub-section** (gold icon chip 🎓 matching dashboard): one bullet for the relevant achievement exam (Tahsili / SAAT).
  3. **"ميزات إضافية" / "Plus"** section, separated by a top border, listing the 4 common bundle features.
- **English card body got `dir="ltr"`** so English bullet list flows naturally LTR; page root stays `dir="rtl"`.
- Used `ps-9` logical padding-start for sub-list indentation.
- **Untouched**: `handleSubscribe('arabic')` / `handleSubscribe('english')` handlers, `confirmSubscription`, the subscription modal, `userSubscriptions` data, `selectedPackage`/`selectedPlan` state, pricing strings, gradient headers, Subscribe button styling/labels/disabled logic, Current Subscriptions Status section, FAQ section, page header/nav, the `grid grid-cols-1 md:grid-cols-2 gap-6` plan layout.

## Routing split: /qudrat and /tahsili (2026-04-25)

Refactored the unified dashboard into two focused routes that mirror the dashboard's exam taxonomy. **No** changes to TestEngine, practice/test routing, AI/API calls, examType / quduratType / tahsiliType / practiceHref / goToTest logic — only routing + UI organization.

- **`src/components/DashboardView.tsx`** (NEW, 1457 lines) — extracted from the old `src/app/dashboard/page.tsx`. Accepts an optional `lockedExamType?: "qudurat" | "tahsili"` prop that:
  - Initializes `examType` state from the prop (with a sync `useEffect` if prop changes).
  - Hides the Aptitude/Achievement group selector grid when set, leaving only the matching variant toggle (Qudrat/GAT or Tahsili/SAAT).
  - Drives the desktop page-title text (`القدرات` / `التحصيلي` / falls back to `لوحة التحكم`).
  - Drives sidebar active-link highlighting.
  - All data, handlers, modal, ProgressCharts/AIAssistant integration, animations are byte-identical to the original dashboard.
- **`src/app/qudrat/page.tsx`** (NEW, ~22 lines) — thin wrapper: `<DashboardView lockedExamType="qudurat" />`, also writes `localStorage.lastDashboardRoute = "/qudrat"`.
- **`src/app/tahsili/page.tsx`** (NEW, ~22 lines) — same pattern with `"tahsili"`.
- **`src/app/dashboard/page.tsx`** (REWRITTEN, ~40 lines) — now a tiny redirect that reads `localStorage.lastDashboardRoute` (default `/qudrat`) and `router.replace`s to it. Renders a brief loading spinner while redirecting. URL still resolves so old bookmarks/links keep working.
- **Sidebar inside DashboardView** — replaced the single "Home" link with two links: `🧠 القدرات → /qudrat` and `🎓 التحصيلي → /tahsili`. Practice / Subscriptions / Profile / theme toggle untouched.
- **Preserved verbatim**: `practiceHref` builder (all GAT/Tahsili/SAAT focus mappings), `goToTest` function (all `/test/qudrat-ar`, `/test/gat-en`, `/test/tahsili-ar`, `/test/saat-en` routes), all four `*FreeTest` configs, all `*ComprehensiveTests` arrays, `quantitativeTopics` / `gatQuantitativeTopics` / `verbalTopics` / `gatVerbalTopics` / `tahsiliTopics` / `saatTopics`, all leaderboards/performance data, the Subscribe modal, the activeTab/tahsiliTab/dashboardView state, the AIAssistant mount.
- **Existing routes left intact**: `/practice`, `/practice/test`, `/test`, `/test/qudrat-ar`, `/test/gat-en`, `/test/tahsili-ar`, `/test/saat-en`, `/test-gat`, `/test-saat`, `/test-tahsili`, `/subscriptions`, `/profile`, `/admin`, `/auth/*`, `/login`, `/forgot-password`, `/reset-password`, `/landing`.

### Mobile category switcher

The desktop sidebar that hosts the `/qudrat` ↔ `/tahsili` links is `hidden lg:flex`, so on mobile the locked group card alone would leave users stranded. DashboardView includes a `lg:hidden` segmented control at the top of `<main>` that mirrors the two route links with `aria-current="page"` on the active one. Sidebar links also carry `aria-current="page"` for accessibility.

## Subscriptions restructured to bundle-by-category (2026-04-25)

Aligned subscriptions UI with the new dashboard route taxonomy.

### Backend audit findings

There is **no payment integration, no entitlement service, no DB tables, and no `/api/subscription*` routes**. `userSubscriptions` was hardcoded mock state with `isSubscribed:false`; `confirmSubscription()` shows an `alert()`. The `"arabic"` / `"english"` plan IDs were pure UI string literals with no consumers outside the component, so renaming carried zero entitlement risk.

### What changed

- **Plan IDs**: `"arabic"` → `"aptitude"`, `"english"` → `"achievement"` everywhere they appear.
- **Bundle composition** (still exactly 2 bundles, not 4):
  - `aptitude` → Aptitude Bundle / **باقة القدرات** = Qudrat (🇸🇦) + GAT (🇬🇧)
  - `achievement` → Achievement Bundle / **باقة التحصيلي** = Tahsili (🇸🇦) + SAAT (🇬🇧)
- **Pricing unchanged** (199 SAR/year, 49 SAR/month).
- **Subscribe handlers**: `handleSubscribe(bundleId)` and `confirmSubscription()` keep the same shape; only the alert / confirmation copy was updated to the new bundle names.
- **Visual identity**: Aptitude card keeps the brand-green hero gradient (`#006C35 → #00A651`) to match the dashboard sidebar 🧠. Achievement card hero changed from navy (`#1e3a5f → #2d5a87`, formerly "English") to brand-gold (`#B8941F → #D4AF37`) to match the sidebar 🎓. Flag emojis (🇸🇦 / 🇬🇧) now appear inline next to each *test name* inside each bundle so users can see at a glance which language each included test is in.
- **FAQ** updated: added a "ما الفرق بين الباقتين؟" entry explaining the new structure; existing answers reworded to reference بـاقة القدرات / باقة التحصيلي instead of "العربية/الإنجليزية".

### Dashboard Subscribe Modal

`src/components/DashboardView.tsx` modal restructured to mirror the same two bundles. The modal's bundle pre-selection is now driven by `lockedExamType ?? examType` instead of UI language — so opening the modal from `/qudrat` pre-selects Aptitude and from `/tahsili` pre-selects Achievement, regardless of whether the user is on the Arabic (Qudrat/Tahsili) or English (GAT/SAAT) tab. All pricing/CTA labels follow the existing `isEnglish` flag for UI language consistency, while bundle CONTENT (which exams are included) is determined by the selected `subscriptionPackage`.

### Files changed

- `src/app/subscriptions/page.tsx` — full rewrite (~497 lines).
- `src/components/DashboardView.tsx` — Subscribe Modal selector / details / features list / CTA + `openSubscribeModal` pre-selection logic.

### Risks / TODOs for when a real backend is wired up

- The `BundleId` type literal `"aptitude" | "achievement"` lives on the client. When entitlements move to the server, mirror these exact identifiers in the entitlement table / payment provider plan IDs to avoid another rename cycle.
- `userSubscriptions` is still mock; replace the constant with a fetch from the entitlement service (keyed by `BundleId`).
- `confirmSubscription()` needs to be wired to the actual payment gateway redirect (currently `alert`).

### Post-review cleanup

- Hoisted `BundleId` type to `src/data/types.ts` (canonical home alongside `ExamCategory` etc.); both files import it via `import type { BundleId } from "@/data/types"` to prevent future drift.
- Dashboard Subscribe Modal heading + tagline now honor `isEnglish` ("Choose your bundle" / "Subscribe now and unlock full access to every test") instead of being hardcoded Arabic.
- Pricing option button alignment (`text-right` ↔ `text-left`) toggles based on `isEnglish` for proper RTL/LTR layout in both UI languages.

## Landing page dark theme pass (2026-05-01)

Two-step color-only refactor of `src/app/landing/page.tsx` to fix readability and align the marketing page with the brand's dark Saudi-green / gold aesthetic. **No logic, layout, spacing, routing, or handler changes** — only Tailwind background/text/border color utilities.

### Step 1 — Navbar + hero feature cards
- **Navbar** (`<header>`): `bg-white/80` → `bg-[#006C35]/95`; logo chip `bg-[#006C35]` → `bg-white/10` (white icon kept); logo title/subtitle → `text-white` / `text-white/70`; nav links + login link → `text-white(/90)` with `hover:text-[#D4AF37]`; "ابدأ مجاناً" CTA changed from green to gold (`bg-[#D4AF37] text-[#006C35]`) so it stays visible on the new green nav.
- **Hero feature cards** (right-side 4 cards): `bg-white` → `bg-[#1a3d2b]`; titles/descriptions → `text-white` / `text-white/70`; border `[#006C35]/5` → `border-white/10`. Icon containers explicitly **kept as-is** (`bg-[#006C35]/10` + green icon) per the spec — they read as a subtle tonal accent rather than a sharp focal point.

### Step 2 — All sections below the hero
Wrapper (`min-h-screen bg-background`) and the hero section were intentionally left untouched so the existing hero rendering doesn't shift.

For sections that previously had no explicit background, an explicit dark surface was added so they no longer inherit the wrapper's light `bg-background`:
- `FREE RESOURCES`, `SCORE PREVIEW`, `FAQ` → `bg-[#0d2b1a]` (deepest)
- `HOW IT WORKS`, `PRICING TEASER`, `FINAL CTA` → `bg-[#1a3d2b]` (mid, alternates)
- Sections already on `bg-[#006C35]` (`MAIN CATEGORIES`, `TESTIMONIALS`, `MORE TOOLS`, `BLOG PREVIEW`) retained their green section background.
- `ACHIEVEMENTS` (already `bg-saudi-gradient-dark`) and `FOOTER` (already `bg-[#1a3a2a]`) untouched.

Inside every section, white card panels (`bg-white`) became `bg-[#1a3d2b]` (or `bg-[#0d2b1a]` for cards inside `bg-[#1a3d2b]` sections to maintain contrast). Card text moved to `text-white` (titles) and `text-white/70-80` (descriptions). All gray dividers (`border-gray-100`) and faint green borders (`border-[#006C35]/5`) became `border-white/10`. Brand-green inline accents (`text-[#006C35]`) on dark surfaces became gold `text-[#D4AF37]` for legibility. Where applicable, secondary accent backgrounds (e.g. testimonial score badge) flipped from `bg-[#006C35]/10` to `bg-[#D4AF37]/10`.

### CTA button rule
"Primary" CTAs against dark/green backgrounds now use solid gold (`bg-[#D4AF37] text-[#006C35]`):
- Navbar "ابدأ مجاناً"
- Score Preview "جرّب لوحة الأداء"
- Pricing highlighted plan CTA "ابدأ الآن"
- Final CTA banner "ابدأ مجاناً الآن"

Secondary/non-highlighted plan CTA stays brand-green `bg-[#006C35] text-white` for hierarchy.

### Translucent overlays preserved
Remaining `bg-white/10`, `bg-white/15`, `bg-white/20` utilities are intentional translucent chips/progress tracks on dark or gradient surfaces (logo chip, blog tag pill, performance card progress bar, final-CTA badge, etc.) — not white panels.

### Strict invariants verified by architect (PASS)
- Every `Link href`, `<a href>`, FAQ `onClick` handler unchanged.
- All `py-*`, `p-*`, `gap-*`, grid-cols, container widths unchanged.
- TypeScript clean (`bunx tsc --noEmit`).
- Page wrapper `bg-background text-foreground` unchanged → hero rendering unchanged.

## Landing page "white rhythm" repaint (2026-05-01, later)

Color-only reversal of the prior dark-theme pass to match a cleaner cathoven.com-style rhythm: white navbar → dark green hero → white/gray-50 alternating middle sections with white cards → dark stats break (achievements) → continued white/gray-50 → dark green Final CTA → dark footer. **No logic, layout, spacing, routing, or handler changes.**

### Section-by-section
- **Navbar**: `bg-[#006C35]/95` → `bg-white/95`, `border-white/10` → `border-gray-100`. Logo chip back to `bg-[#006C35]` with white icon. Title `text-[#006C35]`, subtitle `text-gray-500`. Nav links `text-gray-700 hover:text-[#006C35]`. Login link `text-gray-600 hover:text-[#006C35]`. Primary CTA back to brand green `bg-[#006C35] text-white hover:bg-[#004d26]`.
- **Hero**: section gained explicit `bg-[#0d2b1a] text-white`. Eyebrow chip → `bg-white/10 text-[#D4AF37]`. h1 forced `text-white`; lead `text-white/80`. Primary CTA flipped to gold (`bg-[#D4AF37] text-[#006C35]`) for max pop on dark green; outline CTA `border-white/30 text-white`. Trust row `text-white/80` with gold check icons. Hero feature cards stay `bg-[#1a3d2b]`; their icon chips moved from `bg-[#006C35]/10` (invisible green-on-green) to `bg-white/10` with gold icon.
- **Main Categories**: `bg-[#006C35]` → `bg-white`. Cards `bg-[#1a3d2b]` → `bg-white shadow-lg border-gray-100 hover:border-[#006C35]/30`. Titles → `text-gray-900`, desc → `text-gray-600`. Count + arrow accents → `text-[#006C35]`.
- **Free Resources**: `bg-[#0d2b1a]` → `bg-gray-50`. Cards → `bg-white border-gray-100`, dark text. Resource icon chips kept gold (`bg-[#D4AF37]/15` + gold icon) — gold reads beautifully on white. Section CTA + card CTA → `text-[#006C35]`.
- **Testimonials**: `bg-[#006C35]` → `bg-white`. Cards `bg-white border-gray-100`. Quote glyph muted to `text-[#006C35]/20`. Score badge `text-[#006C35] bg-[#006C35]/10`. Stars stay gold.
- **How It Works**: `bg-[#1a3d2b]` → `bg-gray-50`. Step cards `bg-white border-gray-100`. Faded step number muted to `text-[#006C35]/10`. Step icon chip kept solid green with white icon.
- **More Tools**: `bg-[#006C35]` → `bg-white`. Cards `bg-white border-gray-100`. Icon chips `bg-[#006C35]/10` with `text-[#006C35]` icon.
- **Score Preview**: outer `bg-[#0d2b1a]` → `bg-gray-50`. Inner container `bg-[#1a3d2b]` → `bg-white shadow-lg border-gray-100`. CTA flipped back to brand green `bg-[#006C35] text-white`. Right-side gradient performance card kept (intentional showcase).
- **Achievements**: untouched on purpose — `bg-saudi-gradient-dark` provides a dark stats break between the score-preview gray-50 and pricing white sections, mirroring cathoven's occasional dark feature bands.
- **Pricing**: `bg-[#1a3d2b]` → `bg-white`. Non-highlighted cards `bg-white shadow-lg border-gray-100`, dark text, green check icons, brand-green CTA. Highlighted plan keeps `bg-saudi-gradient text-white` with white text — its CTA reverted to `bg-white text-[#006C35]` (clean inverted) and its badge to `bg-[#D4AF37] text-white`.
- **Blog**: `bg-[#006C35]` → `bg-gray-50`. Cards `bg-white border-gray-100`. Image banner stays `bg-saudi-gradient`. Eyebrow + section CTA + per-card "اقرأ المقال" → `text-[#006C35]`.
- **FAQ**: `bg-[#0d2b1a]` → `bg-white`. Accordion items `bg-white shadow-lg border-gray-100`. Question text `text-gray-900`, chevron `text-[#006C35]`, answer body `text-gray-600`.
- **Final CTA**: outer section stays `bg-[#1a3d2b]`; inner `bg-saudi-gradient` banner kept. Primary inner button reverted from gold to `bg-white text-[#006C35]` (cleaner inverted style on the green gradient).
- **Footer**: untouched (`bg-[#1a3a2a]`).

### Resulting rhythm
white nav → dark-green hero → white → gray-50 → white → gray-50 → white → gray-50 → dark stats → white → gray-50 → white → dark-green CTA → dark footer.

### Invariants
- Wrapper `min-h-screen bg-background text-foreground` unchanged.
- All `Link href`, `<a href>`, FAQ `onClick` handlers unchanged.
- All grid columns, container widths, `py-*`, `p-*`, `gap-*` unchanged.
- TypeScript clean (`bunx tsc --noEmit`).
- Brand palette preserved: `#006C35` Saudi green for primary chrome/CTAs/accents, `#D4AF37` gold reserved for stars, hero accents, and the highlighted-plan badge.

### Architect-driven contrast follow-up (same task, post-review)
The first architect pass on the white-rhythm repaint flagged three contrast regressions, all fixed:
1. **Hero primary CTA** — was `bg-[#D4AF37] text-[#006C35]` (gold + dark green ≈ 3:1). Switched to `bg-white text-[#006C35] hover:bg-gray-100` to match the Final CTA pattern (max contrast against the dark green hero, consistent inverted style across both dark green sections).
2. **Free Resources eyebrow** — was `text-[#D4AF37]` on `bg-gray-50` (low contrast for small bold text). Switched to `text-[#006C35]` to match every other middle-section eyebrow.
3. **Pricing highlighted plan badge** — was `bg-[#D4AF37] text-white` (gold + white ≈ 1.7:1). Reverted to `bg-[#D4AF37] text-[#006C35]` (gold + dark green, original brand pairing).

After the fixes, brand-gold (`#D4AF37`) is reserved on light surfaces only for stars and the highlighted-plan check icons (where it provides intentional accent without carrying critical text), and is paired with dark green or used inside dark surfaces (hero accents, achievements icons) where contrast is solid.

## /diagnostic page + login redirect plumbing (2026-05-01, late)

New post-login funnel for free-trial users from the marketing site, plus a backward-compatible login-param upgrade. **No TestEngine, API, AI, or existing test logic changed. Existing pages untouched aside from the two specific landing CTAs and one additive line in login.**

### Files
- **NEW** `src/app/diagnostic/page.tsx` — client component, auth-guarded, two-card chooser
- **MODIFIED** `src/app/login/page.tsx` — single-line additive change to accept `?redirect=` as alias for `?next=`
- **MODIFIED** `src/app/landing/page.tsx` — two CTA `href` strings updated; nothing else

### Login redirect-param upgrade (additive, backward-compatible)
- Before: `const nextParam = searchParams.get("next")`
- After: `const redirectParam = searchParams.get("redirect") ?? searchParams.get("next")`
- `safeNext` validation unchanged (same `startsWith("/") && !startsWith("//")` same-origin guard, default `/dashboard`).
- Both email/password (`window.location.href = safeNext`) and Google OAuth (`signInWithGoogle(safeNext)` → `/auth/callback?next=...`) honor the resolved path. Legacy `?next=` callers (e.g. server-side OAuth callback chain, any internal/bookmark) keep working unchanged.

### Landing CTAs updated to send free-trial signups through /diagnostic
- Navbar "ابدأ مجاناً" CTA: `/login?next=/test` → `/login?redirect=/diagnostic`
- Final-CTA banner "ابدأ مجاناً الآن": `/login?next=/test` → `/login?redirect=/diagnostic`
- Other landing `/login` links (hero "ابدأ التجربة المجانية", login link in nav, free-resources cards, score-preview CTA, pricing CTAs, blog CTAs) intentionally **not** redirected — they keep the default `/dashboard` post-login destination.

### /diagnostic page
- Client component using `useAuth()` from `@/contexts/AuthContext` (existing app pattern).
- **Auth guard**: `useEffect` checks `!loading && !user` and calls `router.replace("/login?redirect=/diagnostic")`. While `loading || !user`, the page renders only a spinner — protected card content never flashes to unauthed users.
- **Layout** (white bg, brand-green accents, RTL):
  - Header: brand logo chip (link to `/dashboard`) matching landing nav style
  - Centered intro: green eyebrow chip "مرحباً بك" + h1 "اختر نوع الاختبار التجريبي" + lead "اختبار قصير يحدد مستواك الحالي ويبني لك خطة تدريب مخصصة"
  - Two cards (`md:grid-cols-2 max-w-4xl mx-auto`): each `bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-[#006C35] hover:shadow-md transition-all flex flex-col`
    - Card 1 (Brain icon): "اختبار القدرات التجريبي" — يشمل: الكمي / اللفظي → links to existing `/test/qudrat-ar`
    - Card 2 (GraduationCap icon): "اختبار التحصيلي التجريبي" — يشمل: الرياضيات / العلوم → links to existing `/test/tahsili-ar`
  - Each card uses icon chip `bg-[#006C35]/10` + `text-[#006C35]` icon, title `text-2xl font-bold text-gray-900`, body `text-gray-600`, "ابدأ الاختبار" CTA `bg-[#006C35] text-white rounded-xl` pinned to card bottom via `mt-auto`
  - Footnote: "الاختبار التجريبي مجاني تماماً • 30 سؤال • 30 دقيقة"
- No new test logic, no new API, no new TestEngine wrapper — just `<Link>` to the existing test pages.

### Validation
- `bunx tsc --noEmit -p .` clean (no output).
- Architect review: PASS. Verified the `/login?redirect=/diagnostic` round-trip works end-to-end for both email and Google OAuth; backward compat preserved; no open-redirect introduced; no protected-content flash.

## Duplicate auth page removed (2026-05-01, late-2)

User reported "two login pages showing." Root cause: `src/app/page.tsx` (the `/` route) had been a separate signup-only surface (Google button + collapsible "التسجيل بالبريد الإلكتروني" form using `signUp` + `signInWithGoogle`), which looked like a second login page next to the real one at `/login`. Removed.

**Audit:** `src/app/auth/` only contains `callback/route.ts` (OAuth callback, untouched). `src/app/login/page.tsx` is the canonical login surface with the green stats sidebar, full email/password form, Google button, "نسيت كلمة المرور؟" and "إنشاء حساب جديد" — kept verbatim.

### Changes
- **`src/app/page.tsx`** — replaced the entire signup-form component with a 5-line server-side redirect to `/landing`:
  ```tsx
  import { redirect } from "next/navigation";
  export default function Home() { redirect("/landing"); }
  ```
- **`src/app/login/page.tsx`** — single-link update: the "إنشاء حساب جديد" link previously pointed to `/` (the deleted signup form). Now points to `/landing`, where the marketing CTAs ("ابدأ مجاناً") funnel back through `/login?redirect=/diagnostic` via the existing redirect-param plumbing.

### What was NOT touched
- `signIn`, `signInWithGoogle`, `safeNext`, `redirect ?? next` param handling on `/login`
- `AuthContext` / Supabase integration
- `/auth/callback/route.ts`
- `/diagnostic` page or any test/practice/API code
- The kept login page's design, sidebar, fields, or any other link
- All other `<Link href="/">` references in the app (DashboardView logo, forgot-password back, reset-password back, admin back) — these now resolve to `/landing` via the redirect, which is semantically the correct "home" destination

### Validation
- `bunx tsc --noEmit -p .` clean
- Visual: `/` now renders the landing page; `/login?redirect=/diagnostic` still renders the kept login page with the redirect param preserved
- Architect review: PASS

## Per-subject practice overview pages (2026-05-01, late-3)

Six new static-content overview pages — one per Qudrat/Tahsili subject — that introduce the subject, list common question types, teach the fastest solving methods, walk through one worked example, and CTA into the existing `/practice?focus=..._ar` flow. **No changes to TestEngine, /practice page, /practice/test, API, AI, or sidebar structure.** Sidebar child hrefs were updated to point at the new pages (the only sidebar change).

### New routes
| Route | Subject | Parent | CTA target (unchanged) |
|---|---|---|---|
| `/practice/quantitative` | الكمي | `/qudrat` | `/practice?focus=quantitative_ar` |
| `/practice/verbal` | اللفظي | `/qudrat` | `/practice?focus=verbal_ar` |
| `/practice/math` | الرياضيات | `/tahsili` | `/practice?focus=math_ar` |
| `/practice/physics` | الفيزياء | `/tahsili` | `/practice?focus=physics_ar` |
| `/practice/chemistry` | الكيمياء | `/tahsili` | `/practice?focus=chemistry_ar` |
| `/practice/biology` | الأحياء | `/tahsili` | `/practice?focus=biology_ar` |

### Architecture (data-driven, not 6 hand-written pages)
- **`src/app/practice/_subjects/data.ts`** — single source of truth: `SUBJECTS` record keyed by 6 subjects. Each subject carries `{parent, parentLabel, parentHref, nameAr, iconKey, description, stats[3], types[4], methods[5], example{question, options?, solution[], methodHighlight}, focusHref}`. Content matches the spec verbatim (descriptions, types, methods, worked examples per subject).
- **`src/app/practice/_subjects/SubjectPage.tsx`** — shared server-component layout that reads a Subject prop and renders all four sections (hero+stats, types grid, numbered methods list, worked example with gold "الطريقة الأسرع" callout, green CTA card).
- **6 page wrappers** (~5 lines each) at `src/app/practice/{quantitative,verbal,math,physics,chemistry,biology}/page.tsx` that just render `<SubjectPage subject={SUBJECTS.<key>} />`.

### Layout/styling
- Brand-disciplined: white bg, `#006C35` primary, `#D4AF37` / `#8a6d10` gold accents, gray-200 borders, gray-600 body, gray-900 headings. Cards `bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-[#006C35] hover:shadow-md` matching landing/diagnostic rhythm.
- Sticky header with right-side back button "العودة إلى {القدرات|التحصيلي}" linking to the parent dashboard.
- Hero: 20×20 icon chip (`bg-[#006C35]/10`) + gold eyebrow chip + large title + 3-up stats row.
- Section 1: 2×2 grid of question-type cards.
- Section 2: numbered ordered list of 5 method cards with green numbered chip.
- Section 3: question panel (`bg-gray-50`) → numbered solution steps → gold "الطريقة الأسرع" highlight box.
- Section 4: full-bleed green CTA card with white "ابدأ التدريب الآن" button.
- `dir="rtl"` everywhere, all text Arabic, lucide-react icons mapped through a typed `IconKey` registry.

### Sidebar (`src/components/DashboardView.tsx`)
- **6 child `href` values updated** in the Qudrat and Tahsili `children` arrays to point at the new pages. Labels, icons, and menu structure unchanged.
- **`isActiveChild` extended** with two branches:
  - Branch 1: exact pathname match for `/practice/<subject>` (new per-subject pages).
  - Branch 2: legacy `/practice?focus=..._ar` highlight via a stable `PATH_TO_FOCUS` map inside `childFocusOf` so subject highlighting still works when arriving via the "ابدأ التدريب الآن" CTA, the Tahsili parent's own href (`/practice?focus=math_ar`), or any legacy bookmark.
- `isActiveParent` derivation, the chevron toggle, and every other sidebar item left untouched.

### Validation
- `bunx tsc --noEmit -p .` clean.
- Visual: `/practice/quantitative`, `/practice/physics`, `/practice/biology` all render correctly with hero, stats row, types grid, and per-subject content from `data.ts`.
- Architect review: **PASS** (after one round of back-compat fix for legacy URL highlighting in the sidebar).
