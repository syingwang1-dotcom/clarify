export type TaskType = "communication" | "deep" | "recovery" | "active";

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  startTime: string;
  durationMin: number;
  completed: boolean;
  completedAt?: string;
  orderIndex: number;
}

export interface Spark {
  id: string;
  content: string;
  worthFollowing: boolean;
  createdAt: string;
}

export interface DailyContext {
  energy: "high" | "normal" | "low";
  constraints: string;
  rawInput: string;
  reflection?: string;
  aiSummary?: string;
}

// ── AI clarify response ───────────────────────────
export interface AIQuestion {
  taskName: string;
  question: string;
}

export interface ClarifyResponse {
  questions: AIQuestion[];
  clearTasks: string[];
}

export interface ClarifyResult {
  questions: (AIQuestion & { answer: string })[];
  clearTasks: string[];
}
