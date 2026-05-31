import type { Task, Spark, DailyContext } from "./types";

function item<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Tasks ─────────────────────────────────────────
export function getTasks(date: string): Task[] {
  return item<Task[]>(`clarify_tasks_${date}`) ?? [];
}

export function saveTasks(date: string, tasks: Task[]): void {
  setItem(`clarify_tasks_${date}`, tasks);
}

// ── Sparks ────────────────────────────────────────
export function getSparks(date: string): Spark[] {
  return item<Spark[]>(`clarify_sparks_${date}`) ?? [];
}

export function saveSpark(date: string, content: string): void {
  const sparks = getSparks(date);
  const spark: Spark = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    content,
    worthFollowing: false,
    createdAt: new Date().toISOString(),
  };
  sparks.push(spark);
  setItem(`clarify_sparks_${date}`, sparks);
}

// ── Daily context ─────────────────────────────────
export function getDailyContext(date: string): DailyContext | null {
  return item<DailyContext>(`clarify_context_${date}`);
}

export function saveDailyContext(date: string, context: DailyContext): void {
  setItem(`clarify_context_${date}`, context);
}
