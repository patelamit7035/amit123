import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const DEFAULT_STATE = {
  logs: [],
  // Per-ad-set bookkeeping the Meta API doesn't track for us.
  adSetMeta: {}, // { [adSetId]: { lastCreativeRotation: iso, pendingCreatives: [...] } }
};

let state = null;

async function ensureLoaded() {
  if (state) return state;
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) {
    try {
      state = { ...DEFAULT_STATE, ...JSON.parse(await readFile(DATA_FILE, "utf-8")) };
    } catch {
      state = { ...DEFAULT_STATE };
    }
  } else {
    state = { ...DEFAULT_STATE };
  }
  return state;
}

async function persist() {
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function getStoreState() {
  return ensureLoaded();
}

export async function appendLog(entry) {
  const s = await ensureLoaded();
  s.logs.unshift({ id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...entry });
  s.logs = s.logs.slice(0, 500);
  await persist();
  return entry;
}

export async function getAdSetMeta(adSetId) {
  const s = await ensureLoaded();
  return s.adSetMeta[adSetId] || { lastCreativeRotation: null, pendingCreatives: [] };
}

export async function setAdSetMeta(adSetId, partial) {
  const s = await ensureLoaded();
  s.adSetMeta[adSetId] = { ...(s.adSetMeta[adSetId] || { lastCreativeRotation: null, pendingCreatives: [] }), ...partial };
  await persist();
  return s.adSetMeta[adSetId];
}
