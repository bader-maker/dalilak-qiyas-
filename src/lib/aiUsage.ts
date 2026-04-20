// Server-side global AI usage limiter.
//
// - Tracks the number of successful AI analyses generated per calendar month
// - Enforces a hard cap (default 30,000 / month) to bound OpenAI cost
// - Persists the counter to a small JSON file so the count survives process
//   restarts (in-memory would reset and silently re-allow calls)
// - Uses a per-process promise-chain mutex to avoid TOCTOU between concurrent
//   requests in the same instance
//
// Storage: <project>/.data/ai-usage.json — single small file, one bucket per
// month. Old buckets are dropped automatically when the month rolls over.

import { promises as fs } from "fs";
import path from "path";

export const AI_USAGE_LIMIT = Number(process.env.AI_ANALYSIS_MONTHLY_LIMIT || 30000);

const STORAGE_DIR = path.join(process.cwd(), ".data");
const STORAGE_FILE = path.join(STORAGE_DIR, "ai-usage.json");

type UsageFile = {
  month: string; // "YYYY-MM"
  count: number;
  updatedAt: string;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readUsage(): Promise<UsageFile> {
  try {
    const raw = await fs.readFile(STORAGE_FILE, "utf8");
    const parsed = JSON.parse(raw) as UsageFile;
    if (parsed && typeof parsed.count === "number" && typeof parsed.month === "string") {
      return parsed;
    }
  } catch {
    // file missing or corrupt — fall through to a fresh bucket
  }
  return { month: currentMonth(), count: 0, updatedAt: new Date().toISOString() };
}

async function writeUsage(u: UsageFile): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(STORAGE_FILE, JSON.stringify(u, null, 2), "utf8");
}

// Per-process mutex so concurrent requests in the same Node instance don't
// race on the read-modify-write cycle.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  // Swallow errors on the chain itself so one failure doesn't poison later calls
  chain = next.catch(() => undefined);
  return next;
}

export type UsageCheck = {
  allowed: boolean;
  count: number;
  month: string;
  limit: number;
};

/**
 * Atomically: roll the bucket to the current month if needed, check the cap,
 * and increment if there is room. Caller should only proceed with the AI call
 * when `allowed === true`.
 *
 * We increment BEFORE the AI call (i.e. reserve a slot) so a burst of
 * concurrent requests cannot all pass the check and then collectively exceed
 * the cap. If the AI call later fails the slot is released via `releaseSlot()`.
 */
export async function reserveSlot(): Promise<UsageCheck> {
  return withLock(async () => {
    const current = await readUsage();
    const month = currentMonth();

    // Month rollover → fresh bucket
    const bucket: UsageFile =
      current.month === month
        ? current
        : { month, count: 0, updatedAt: new Date().toISOString() };

    if (bucket.count >= AI_USAGE_LIMIT) {
      // Persist any rollover that just happened, then deny
      if (bucket !== current) await writeUsage(bucket);
      console.warn(
        `[ai-usage] cap reached for ${month}: ${bucket.count}/${AI_USAGE_LIMIT} — denying request`
      );
      return {
        allowed: false,
        count: bucket.count,
        month: bucket.month,
        limit: AI_USAGE_LIMIT,
      };
    }

    bucket.count += 1;
    bucket.updatedAt = new Date().toISOString();
    await writeUsage(bucket);
    console.log(
      `[ai-usage] ${bucket.month} usage ${bucket.count}/${AI_USAGE_LIMIT}`
    );
    return {
      allowed: true,
      count: bucket.count,
      month: bucket.month,
      limit: AI_USAGE_LIMIT,
    };
  });
}

/** Release a previously reserved slot (e.g. when the AI call itself fails). */
export async function releaseSlot(): Promise<void> {
  await withLock(async () => {
    const current = await readUsage();
    if (current.month !== currentMonth()) return; // bucket already rolled over
    if (current.count > 0) {
      current.count -= 1;
      current.updatedAt = new Date().toISOString();
      await writeUsage(current);
    }
  });
}

/** Read-only snapshot, useful for diagnostics. */
export async function getUsage(): Promise<UsageFile> {
  return withLock(async () => {
    const current = await readUsage();
    if (current.month !== currentMonth()) {
      return { month: currentMonth(), count: 0, updatedAt: new Date().toISOString() };
    }
    return current;
  });
}
