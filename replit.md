# دليلك إلى قياس — Saudi Exam Prep

Next.js 15.3.7 (App Router, Turbopack) · Bun · TypeScript · Supabase · Tailwind. Arabic-first / RTL, Tajawal font. Brand colors: `#006C35` (green) and `#D4AF37` (gold).

Dev server runs on port 5000 via the `Start application` workflow:

```
bun run dev -- -p 5000
```

## Architecture notes

- **Practice flow** (`src/app/practice/test/page.tsx`): self-paced training, 90-second per-question timer, hint reveal, explanation reveal, and "تدرب على نفس النمط" (practice similar) in-session insertion.
- **Adaptive difficulty** (`src/lib/adaptiveDifficulty.ts`): re-ranks the upcoming slice every 5 answered questions so the next batch favors the difficulty that matches the student's current performance, using a 70/30 mix (target tier / other tiers). The adaptive effect is gated by:
  - identity-based session detection (`lastSessionRef`) so `practiceSimilar` inserts don't restart adaptation, and
  - a milestone guard (`lastAdaptedAtRef`) so each multiple-of-5 boundary only fires once.
- **Adaptive signals** (added 2026-04-24): in addition to overall accuracy, `summarizePerformance` accepts optional per-question `times` (seconds spent) and `hints` (boolean revealed flag) arrays. Over the most recent window it derives:
  - `fastWrongRate` ≥ 0.4 → step easier ("guessing under time pressure"),
  - `hintRate` ≥ 0.4 → step easier ("relying on hints"),
  - `fastCorrectRate` ≥ 0.6 → step harder ("mastering quickly — push faster"),
  - `slowCorrectRate` ≥ 0.5 with base = hard and `fastCorrectRate` < 0.4 → step easier to medium ("understands but slow"). Adjustments are clamped to ±2 steps and only fire when ≥3 samples are in the window. Signal arrays are optional, so omitting them reproduces the original accuracy-only behavior.
  Speed thresholds (`FAST_SECONDS=15`, `SLOW_SECONDS=45`) are tuned to the practice page's 90-second timer and exported for future tuning.
- **Full exams** (`src/components/TestEngine.tsx`, `/test`, `/test-gat`) use a separate engine and are intentionally NOT touched by the practice-page adaptive logic.

## Persistent user profile

Long-running, cross-session aggregate of the student's practice performance, stored under the `user_profile` localStorage key (separate from `TrainingContext`'s per-question history under `dalilak_training_state`).

- **Module:** `src/lib/userProfile.ts` (pure data layer — SSR-safe, corruption-safe, versioned).
- **Stored:** raw counters (totals + per-topic counters: `answered`, `correct`, `timeSeconds`, `timedAnswered`, `hintsUsed`) plus `version`, `updatedAt`, `sessionsCompleted`, plus an optional `diagnostic` snapshot (see below). Storing counters (not pre-computed rates) means future signal additions don't require migrating historical data.
- **Updated (session signal):** at practice-session end — `applySessionToProfile(loadUserProfile(), payload)` then `saveUserProfile(...)`. A ref-based guard ensures one save per session reference; on transient storage failure the guard stays clear so the next re-render retries. The aggregator spreads the previous profile so the optional `diagnostic` field is preserved across session writes.
- **Updated (diagnostic signal):** at full-exam end — `applyDiagnosticToProfile(loadUserProfile(), input)` then `saveUserProfile(...)` is called from the same effect that writes to `examHistory.ts`, in all three full-exam result paths (`src/components/TestEngine.tsx`, `src/app/test/page.tsx`, `src/app/test-gat/page.tsx`). The snapshot replaces any prior diagnostic on each new exam (per-attempt history still lives in `qiyas_full_exam_history_v1`). The snapshot derives, from the same `categoryPerformance` payload examHistory receives: `weakestTopics`, `strongestTopics`, `weakestSections`, `strongestSections` (each capped at 3, deterministic alphabetical tiebreakers), plus `overallScore`, `avgTimePerQuestion`, `examKind`, `takenAt`, and `source: "diagnostic"`.
- **Derived signals (`summarizeProfile`):** strongest topics (top 3 by accuracy with ≥5 answered), weakest topics (bottom 3 same gating), average accuracy, average speed (seconds per timed answer), hint usage rate.
- **Recommendations (`getStudyRecommendations`):** priority order — (1) diagnostic snapshot wins when present (`source: "diagnostic"`, recommended difficulty derived from `overallScore`), (2) session-derived weak topics with the existing `≥1 session AND ≥5 answers` gate (`source: "sessions"`), (3) empty defaults (`source: "none"`). All three paths agree on the same `<50 / 50–80 / >80` accuracy boundaries used by the per-session adaptive engine.
- **Practice topic selection:** in the focus branch of `src/app/practice/test/page.tsx`, when no `?topics=` URL param is supplied, the loader consults `getStudyRecommendations(loadUserProfile())`. If the source is `"diagnostic"` and any of the recommended topics resolve to slugs present in the current section's pool (mapped via `categoryNameToSlug` for Arabic/English display labels), they bias the existing 4-tier prioritization (matching-fresh → matching-stale → other-fresh → other-stale). When no diagnostic exists, no topics map to the section, or the URL `?topics=` is supplied explicitly, behavior is unchanged.

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
