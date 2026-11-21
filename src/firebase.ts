import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { doc, getDocFromServer, getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import type {
  BlockCategory,
  BudgetCategoryName,
  BudgetLimits,
  SchedulePreferences,
  TaskCategory,
  TaskPriority,
  Weekday,
} from "./types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Defensive Payload Sanitization (Synchronized with firebase-blueprint.json) ---

export function sanitizeId(raw: string, prefix = "id"): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${prefix}-${Date.now()}`;
}

export function clampString(val: unknown, maxLength: number, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  return val.trim().slice(0, maxLength);
}

export function clampNumber(
  val: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function normalizeHHMM(val: unknown, fallback = "09:00"): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function normalizeISODate(val: unknown, fallback: string): string {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

const VALID_WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function normalizeWeekday(val: unknown, fallback: Weekday = "Mon"): Weekday {
  return VALID_WEEKDAYS.includes(val as Weekday) ? (val as Weekday) : fallback;
}

export function normalizeWeekdaysList(days: unknown): Weekday[] {
  if (!Array.isArray(days)) return ["Mon"];
  const unique = Array.from(
    new Set(days.filter((d): d is Weekday => VALID_WEEKDAYS.includes(d as Weekday)))
  ).slice(0, 7);
  return unique.length > 0 ? unique : ["Mon"];
}

const VALID_BLOCK_CATEGORIES: BlockCategory[] = [
  "class",
  "study",
  "activity",
  "errand",
  "wellness",
  "work",
  "break",
];
export function normalizeBlockCategory(
  val: unknown,
  fallback: BlockCategory = "activity"
): BlockCategory {
  return VALID_BLOCK_CATEGORIES.includes(val as BlockCategory)
    ? (val as BlockCategory)
    : fallback;
}

const VALID_TASK_CATEGORIES: TaskCategory[] = [
  "Academic",
  "Errand",
  "Finance",
  "Personal",
];
export function normalizeTaskCategory(val: unknown): TaskCategory {
  return VALID_TASK_CATEGORIES.includes(val as TaskCategory)
    ? (val as TaskCategory)
    : "Personal";
}

const VALID_PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
export function normalizePriority(val: unknown): TaskPriority {
  return VALID_PRIORITIES.includes(val as TaskPriority)
    ? (val as TaskPriority)
    : "Medium";
}

const VALID_BUDGET_CATEGORIES: BudgetCategoryName[] = [
  "Dining & Groceries",
  "Housing & Utilities",
  "Textbooks & Study",
  "Transit",
  "Personal & Leisure",
  "Other",
];
export function normalizeBudgetCategory(val: unknown): BudgetCategoryName {
  return VALID_BUDGET_CATEGORIES.includes(val as BudgetCategoryName)
    ? (val as BudgetCategoryName)
    : "Other";
}

export function sanitizePreferences(prefs: SchedulePreferences): SchedulePreferences {
  return {
    wakeTime: normalizeHHMM(prefs.wakeTime, "07:30"),
    sleepTime: normalizeHHMM(prefs.sleepTime, "23:00"),
    breakMinutes: clampNumber(prefs.breakMinutes, 0, 120, 15),
    scope: prefs.scope === "today" ? "today" : "week",
    focusNote: clampString(prefs.focusNote, 500),
    includeClasses: Boolean(prefs.includeClasses),
    includeTasks: Boolean(prefs.includeTasks),
  };
}

export function sanitizeBudgetLimits(limits: BudgetLimits): BudgetLimits {
  const cats = limits.categories || ({} as Record<BudgetCategoryName, number>);
  return {
    monthlyCap: clampNumber(limits.monthlyCap, 0, 100000000, 180000),
    categories: {
      "Dining & Groceries": clampNumber(cats["Dining & Groceries"], 0, 100000000, 55000),
      "Housing & Utilities": clampNumber(cats["Housing & Utilities"], 0, 100000000, 65000),
      "Textbooks & Study": clampNumber(cats["Textbooks & Study"], 0, 100000000, 22000),
      Transit: clampNumber(cats["Transit"], 0, 100000000, 16000),
      "Personal & Leisure": clampNumber(cats["Personal & Leisure"], 0, 100000000, 14000),
      Other: clampNumber(cats["Other"], 0, 100000000, 8000),
    },
  };
}
