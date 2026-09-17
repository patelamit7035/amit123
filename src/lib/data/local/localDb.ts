import { DEFAULT_SETTINGS } from "@/lib/affiliate/constants";
import type {
  AffiliateLink,
  AppSettings,
  BankDetails,
  Conversion,
  EmailLogEntry,
  Lead,
  Payout,
  Product,
  Profile,
} from "@/lib/affiliate/types";

export const STORAGE_KEY = "funnelos.affiliate.db.v1";
export const SESSION_KEY = "funnelos.affiliate.session.v1";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory storage used by tests and by SSR/no-DOM contexts. */
export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

export function browserStorage(): KeyValueStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // Touch it - Safari private mode throws on write, not on access.
      const probe = "__funnelos_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    /* falls through to memory */
  }
  return memoryStorage();
}

export interface Credential {
  userId: string;
  email: string;
  passwordHash: string;
}

export interface Db {
  profiles: Profile[];
  credentials: Credential[];
  bank: BankDetails[];
  products: Product[];
  links: AffiliateLink[];
  leads: Lead[];
  conversions: Conversion[];
  payouts: Payout[];
  emailLog: EmailLogEntry[];
  settings: AppSettings;
}

export function emptyDb(): Db {
  return {
    profiles: [],
    credentials: [],
    bank: [],
    products: [],
    links: [],
    leads: [],
    conversions: [],
    payouts: [],
    emailLog: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadDb(storage: KeyValueStorage): Db | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Db>;
    return { ...emptyDb(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } };
  } catch {
    return null;
  }
}

export function saveDb(storage: KeyValueStorage, db: Db): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let counter = 0;

/** RFC-4122-ish id. Uses crypto.randomUUID where available. */
export function newId(prefix = ""): string {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const raw = cryptoObj?.randomUUID
    ? cryptoObj.randomUUID()
    : `${Date.now().toString(36)}-${(counter += 1).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${raw}` : raw;
}

/**
 * Password hashing for the offline demo backend only.
 *
 * The demo has no server, so there is nowhere to keep a real secret - this
 * exists so passwords are not sitting in localStorage as plain text, and it is
 * NOT a substitute for real password storage. In production the Supabase
 * backend is used instead and Supabase Auth hashes credentials with bcrypt.
 */
export function hashPassword(password: string, salt = "funnelos"): string {
  const input = `${salt}:${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + code + i, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
