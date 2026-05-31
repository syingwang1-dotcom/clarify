import { getTasks, getDailyContext } from "./storage";

interface EfficiencyStats {
  totalDays: number;
  avgCompletionRate: number;
  byType: Record<string, { planned: number; completed: number }>;
  byEnergy: Record<string, { planned: number; completed: number }>;
  peakHours: string;
  mostPostponedType: string;
  avgPlanned: number;
  avgCompleted: number;
}

function analyzeDays(days: string[]): EfficiencyStats | null {
  const stats: EfficiencyStats = {
    totalDays: 0,
    avgCompletionRate: 0,
    byType: {},
    byEnergy: {},
    peakHours: "",
    mostPostponedType: "",
    avgPlanned: 0,
    avgCompleted: 0,
  };

  let totalPlanned = 0;
  let totalCompleted = 0;
  const dayRates: number[] = [];
  const hourBuckets: Record<string, { planned: number; completed: number }> = {};

  for (const date of days) {
    const tasks = getTasks(date);
    if (tasks.length === 0) continue;

    const ctx = getDailyContext(date);
    stats.totalDays++;
    totalPlanned += tasks.length;
    const completed = tasks.filter((t) => t.completed);
    totalCompleted += completed.length;
    dayRates.push(completed.length / tasks.length);

    // By type
    for (const t of tasks) {
      if (!stats.byType[t.type]) stats.byType[t.type] = { planned: 0, completed: 0 };
      stats.byType[t.type].planned++;
      if (t.completed) stats.byType[t.type].completed++;

      // Hour bucket
      if (t.completed && t.completedAt) {
        const hour = t.completedAt.slice(11, 13);
        if (!hourBuckets[hour]) hourBuckets[hour] = { planned: 0, completed: 0 };
        hourBuckets[hour].planned++;
        hourBuckets[hour].completed++;
      }
    }

    // By energy
    const energy = ctx?.energy ?? "unknown";
    if (!stats.byEnergy[energy]) stats.byEnergy[energy] = { planned: 0, completed: 0 };
    stats.byEnergy[energy].planned += tasks.length;
    stats.byEnergy[energy].completed += completed.length;
  }

  if (stats.totalDays === 0) return null;

  stats.avgCompletionRate = totalPlanned > 0 ? totalCompleted / totalPlanned : 0;
  stats.avgPlanned = Math.round(totalPlanned / stats.totalDays);
  stats.avgCompleted = Math.round(totalCompleted / stats.totalDays);

  // Peak hours
  let bestRate = 0;
  let bestHour = "";
  for (const [hour, data] of Object.entries(hourBuckets)) {
    const rate = data.planned > 0 ? data.completed / data.planned : 0;
    if (rate > bestRate && data.planned >= 2) {
      bestRate = rate;
      bestHour = hour;
    }
  }
  stats.peakHours = bestHour ? `${bestHour}:00-${String(Number(bestHour) + 1).padStart(2, "0")}:00` : "数据不足";

  // Most postponed type
  let worstRate = 1;
  let worstType = "";
  for (const [type, data] of Object.entries(stats.byType)) {
    const rate = data.planned > 0 ? data.completed / data.planned : 1;
    if (rate < worstRate && data.planned >= 2) {
      worstRate = rate;
      worstType = type;
    }
  }
  stats.mostPostponedType = worstType;

  return stats;
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    communication: "沟通类",
    deep: "深度工作",
    recovery: "恢复类",
    active: "进行中",
  };
  return map[t] ?? t;
}

export function getEfficiencyProfile(): string {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const stats = analyzeDays(days);
  if (!stats) return "暂无足够的历史数据。";

  const lines: string[] = [];
  lines.push(`近${stats.totalDays}天完成率 ${Math.round(stats.avgCompletionRate * 100)}%`);

  // By type
  const typeParts: string[] = [];
  for (const [type, data] of Object.entries(stats.byType)) {
    const rate = data.planned > 0 ? Math.round((data.completed / data.planned) * 100) : 0;
    typeParts.push(`${typeLabel(type)} ${rate}%`);
  }
  lines.push(`各类型完成率: ${typeParts.join("，")}`);

  // Most postponed
  if (stats.mostPostponedType) {
    lines.push(`最常被推迟: ${typeLabel(stats.mostPostponedType)}`);
  }

  // By energy
  const energyParts: string[] = [];
  for (const [energy, data] of Object.entries(stats.byEnergy)) {
    const rate = data.planned > 0 ? Math.round((data.completed / data.planned) * 100) : 0;
    const label = energy === "high" ? "精力充沛" : energy === "normal" ? "精力一般" : energy === "low" ? "疲惫" : "未知";
    energyParts.push(`${label} ${rate}%`);
  }
  lines.push(`精力水平完成率: ${energyParts.join("，")}`);

  lines.push(`高效时段: ${stats.peakHours}`);
  lines.push(`日均计划 ${stats.avgPlanned} 项，完成 ${stats.avgCompleted} 项`);

  return lines.join("；");
}

export interface EfficiencyCard {
  title: string;
  value: string;
  detail: string;
}

export function getEfficiencyCards(): EfficiencyCard[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const stats = analyzeDays(days);
  if (!stats || stats.totalDays < 2) return [];

  const cards: EfficiencyCard[] = [];

  // Completion rate
  cards.push({
    title: "完成率",
    value: `${Math.round(stats.avgCompletionRate * 100)}%`,
    detail: `近${stats.totalDays}天 · 日均${stats.avgPlanned}计划 ${stats.avgCompleted}完成`,
  });

  // Peak hours
  cards.push({
    title: "高效时段",
    value: stats.peakHours,
    detail: "完成率最高的时间段",
  });

  // Most postponed type
  if (stats.mostPostponedType) {
    const typeData = stats.byType[stats.mostPostponedType];
    const rate = typeData ? Math.round((typeData.completed / typeData.planned) * 100) : 0;
    cards.push({
      title: "需关注",
      value: `${typeLabel(stats.mostPostponedType)} ${rate}%`,
      detail: "完成率最低的任务类型",
    });
  }

  // Energy match
  if (stats.byEnergy["high"]) {
    const high = stats.byEnergy["high"];
    const highRate = high.planned > 0 ? Math.round((high.completed / high.planned) * 100) : 0;
    const low = stats.byEnergy["low"];
    const lowRate = low && low.planned > 0 ? Math.round((low.completed / low.planned) * 100) : 0;
    cards.push({
      title: "精力匹配",
      value: lowRate > 0 ? `精力充沛 ${highRate}% · 疲惫 ${lowRate}%` : `${highRate}%`,
      detail: lowRate > 0 ? "精力越好，完成率越高" : "精力充沛日完成率",
    });
  }

  return cards;
}
