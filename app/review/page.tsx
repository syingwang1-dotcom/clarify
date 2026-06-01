"use client";

import { useState, useEffect, useCallback } from "react";
import { NavHeader } from "@/components/NavHeader";
import { Card } from "@/components/ui/Card";
import { getTasks, getSparks, getDailyContext } from "@/lib/storage";
import { getEfficiencyCards, type EfficiencyCard } from "@/lib/efficiency";
import type { Task, Spark, DailyContext } from "@/lib/types";

// ── Helpers ────────────────────────────────────────
const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = weekdays[d.getDay()];
  return `${y}年${m}月${day}日 ${w}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// ── Card component for efficiency ────────────────────
function StatCard({ title, value, detail }: EfficiencyCard) {
  return (
    <div className="bg-[#F9F8F6] border-t border-[#1A1A1A]/10 px-6 py-5">
      <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-2">
        {title}
      </p>
      <p className="font-serif text-xl text-[#1A1A1A] mb-1">{value}</p>
      <p className="text-xs text-[#6C6863]">{detail}</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────
export default function ReviewPage() {
  const [viewDate, setViewDate] = useState(todayKey());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [ctx, setCtx] = useState<DailyContext | null>(null);
  const [cards, setCards] = useState<EfficiencyCard[]>([]);
  const [mounted, setMounted] = useState(false);

  // Read ?date= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setViewDate(d);
    }
    setMounted(true);
  }, []);

  // Update URL when viewDate changes
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    url.searchParams.set("date", viewDate);
    window.history.replaceState({}, "", url.toString());
  }, [viewDate, mounted]);

  // Load data for the selected date
  const loadData = useCallback((date: string) => {
    setTasks(getTasks(date));
    setSparks(getSparks(date));
    setCtx(getDailyContext(date));
  }, []);

  // Load efficiency cards (global, not date-specific)
  useEffect(() => {
    setCards(getEfficiencyCards());
    document.title = "复盘 · Clarify";
  }, []);

  useEffect(() => {
    loadData(viewDate);
  }, [viewDate, loadData]);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setViewDate((d) => shiftDate(d, -1));
      if (e.key === "ArrowRight") setViewDate((d) => shiftDate(d, 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Stats
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const progress = total > 0 ? completed / total : 0;
  const allDone = total > 0 && completed === total;
  const isToday = viewDate === todayKey();

  // ── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <NavHeader />

      <main className="pt-20">
        {/* ── Date navigation ──────────────────────── */}
        <div className="mb-12 flex items-center justify-between">
          <button
            onClick={() => setViewDate((d) => shiftDate(d, -1))}
            className="text-xs uppercase tracking-[0.1em] text-[#6C6863] cursor-pointer hover:text-[#1A1A1A] transition-all"
            style={{
              transitionDuration: "500ms",
              transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            ◀ 前一天
          </button>

          <h2 className="font-serif text-2xl text-[#1A1A1A]">
            {formatDate(viewDate)}
          </h2>

          <button
            onClick={() => setViewDate((d) => shiftDate(d, 1))}
            disabled={isToday}
            className="text-xs uppercase tracking-[0.1em] text-[#6C6863] cursor-pointer hover:text-[#1A1A1A] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              transitionDuration: "500ms",
              transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            后一天 ▶
          </button>
        </div>

        {/* ── No data ──────────────────────────────── */}
        {total === 0 && sparks.length === 0 && !ctx && (
          <div className="py-20 text-center">
            <p className="text-sm text-[#6C6863] font-serif italic">
              {isToday ? "今天还没有记录" : "这一天还没有数据"}
            </p>
          </div>
        )}

        {/* ── Summary ──────────────────────────────── */}
        {total > 0 && (
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-4">
              任务
            </p>
            <div className="flex justify-between items-end mb-4">
              <p className="font-sans text-sm text-[#1A1A1A]" style={{ fontWeight: 500 }}>
                {completed} / {total} 完成
              </p>
            </div>
            <div className="h-[1px] bg-[#EBE5DE] relative">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(progress * 100, 0)}%`,
                  backgroundColor: allDone ? "#D4AF37" : "#1A1A1A",
                  transitionDuration: "700ms",
                  transitionTimingFunction:
                    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                }}
              />
            </div>

            {/* Task list mini */}
            <div className="mt-6 space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      t.completed
                        ? "text-[#D4AF37]"
                        : "text-[#6C6863]"
                    }
                  >
                    {t.completed ? "✓" : "○"}
                  </span>
                  <span
                    className={
                      t.completed
                        ? "line-through text-[#6C6863]"
                        : "text-[#1A1A1A]"
                    }
                  >
                    {t.name}
                  </span>
                  <span className="text-[11px] text-[#6C6863]">
                    {t.startTime}
                    {t.completed && (
                      t.actualDurationMin != null
                        ? ` · 实际 ${t.actualStart}-${t.actualEnd} (${t.actualDurationMin}min)`
                        : t.completedAt && ` · ${new Date(t.completedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })} 完成（按计划）`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Context ──────────────────────────────── */}
        {ctx && (
          <div className="mb-16">
            <Card>
              {ctx.rawInput && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-1">
                    原始输入
                  </p>
                  <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-line font-serif italic">
                    {ctx.rawInput}
                  </p>
                </div>
              )}
              <div className="flex gap-4 text-xs text-[#6C6863]">
                {ctx.energy && (
                  <span>
                    精力：{ctx.energy === "high" ? "充沛" : ctx.energy === "normal" ? "一般" : "疲惫"}
                  </span>
                )}
                {ctx.constraints && <span>约束：{ctx.constraints}</span>}
              </div>
            </Card>
          </div>
        )}

        {/* ── Efficiency cards ─────────────────────── */}
        {cards.length > 0 && (
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-4">
              效率分析
            </p>
            <div className="grid grid-cols-2 gap-4">
              {cards.map((card, i) => (
                <StatCard key={i} {...card} />
              ))}
            </div>
          </div>
        )}

        {cards.length === 0 && total > 0 && (
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-4">
              效率分析
            </p>
            <Card>
              <p className="text-sm text-[#6C6863] font-serif italic">
                积累更多数据后将展示效率分析
              </p>
            </Card>
          </div>
        )}

        {/* ── Sparks ───────────────────────────────── */}
        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-4">
            火花
          </p>
          {sparks.length === 0 ? (
            <Card>
              <p className="text-sm text-[#6C6863] font-serif italic">
                {isToday ? "今天还没有记录火花" : "这一天还没有记录火花"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sparks.map((s) => (
                <Card key={s.id}>
                  <p className="text-sm text-[#1A1A1A] leading-relaxed mb-2">
                    {s.content}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-[#6C6863]">
                    <span>{new Date(s.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                    {s.worthFollowing && (
                      <span className="text-[#D4AF37]">值得跟进</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
