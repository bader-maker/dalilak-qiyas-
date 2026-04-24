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

## Conventions

- All UI strings are Arabic; layout is RTL by default. Use `dir="rtl"` and `unicodeBidi: "isolate"` when mixing numerals/Latin text inside Arabic strings.
- Brand colors are referenced as Tailwind arbitrary values (`text-[#006C35]`, `bg-[#D4AF37]/10`, etc.).
- Per-question signal state (`answers`, `times`, `hints`) MUST be kept index-parallel through every mutation — including the in-session `practiceSimilar` insertion and both session-build branches.
