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

## Conventions

- All UI strings are Arabic; layout is RTL by default. Use `dir="rtl"` and `unicodeBidi: "isolate"` when mixing numerals/Latin text inside Arabic strings.
- Brand colors are referenced as Tailwind arbitrary values (`text-[#006C35]`, `bg-[#D4AF37]/10`, etc.).
- Per-question signal state (`answers`, `times`, `hints`) MUST be kept index-parallel through every mutation — including the in-session `practiceSimilar` insertion and both session-build branches. The session-end profile-save effect relies on this.
