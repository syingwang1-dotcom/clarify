"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { getTasks, saveTasks, saveSpark, getDailyContext } from "@/lib/storage";
import { getEfficiencyProfile } from "@/lib/efficiency";
import type { Task, TaskType } from "@/lib/types";

// ── Helpers ────────────────────────────────────────
const typeLabels: Record<TaskType, string> = {
  communication: "沟通",
  deep: "深度",
  recovery: "恢复",
  active: "进行中",
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Sortable task item ─────────────────────────────
function SortableTask({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "bg-[#F9F8F6] border-t border-[#1A1A1A]/10 px-6 py-5 transition-all cursor-grab active:cursor-grabbing",
        isDragging ? "shadow-[0_4px_16px_rgba(0,0,0,0.08)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={[
            "w-5 h-5 flex items-center justify-center border transition-all shrink-0",
            task.completed
              ? "bg-[#1A1A1A] border-[#1A1A1A]"
              : "border-[#1A1A1A] bg-transparent",
          ].join(" ")}
          style={{
            transitionDuration: "500ms",
            transitionTimingFunction:
              "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {task.completed && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="pointer-events-none animate-check-pop"
            >
              <path
                d="M2 6.5L4.5 9L10 3"
                stroke="#F9F8F6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Task name */}
        <span
          className={[
            "flex-1 text-sm transition-all",
            task.completed
              ? "line-through text-[#6C6863]"
              : "text-[#1A1A1A]",
          ].join(" ")}
          style={{
            transitionDuration: "500ms",
            transitionTimingFunction:
              "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {task.name}
        </span>

        {/* Time / duration */}
        <span className="text-[11px] text-[#6C6863] tracking-wide shrink-0">
          {task.startTime} · {task.durationMin}min
        </span>

        {/* Type tag */}
        <span
          className={[
            "text-[11px] text-[#6C6863] uppercase tracking-[0.08em] shrink-0",
            task.type === "active" ? "border-b border-[#D4AF37]" : "",
          ].join(" ")}
        >
          {typeLabels[task.type]}
        </span>

        {/* Completion time */}
        {task.completed && task.completedAt && (
          <span className="text-[11px] text-[#6C6863] shrink-0">
            {new Date(task.completedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })} 完成
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────
export default function ExecPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spark entry
  const [sparkOpen, setSparkOpen] = useState(false);
  const [sparkText, setSparkText] = useState("");
  const [sparkSaved, setSparkSaved] = useState(false);

  // Add task
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskName, setAddTaskName] = useState("");
  const [addTaskType, setAddTaskType] = useState<TaskType>("active");
  const [addTaskTime, setAddTaskTime] = useState(
    new Date().toTimeString().slice(0, 5),
  );
  const [addTaskDuration, setAddTaskDuration] = useState(30);

  // Dynamic adjustment
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState("");
  const [replanning, setReplanning] = useState(false);
  const [replanError, setReplanError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // On mount: check for pending SOP generation, or load from localStorage
  useEffect(() => {
    const today = todayKey();
    const pendingRaw = localStorage.getItem("clarify_pending_sop");

    if (pendingRaw) {
      localStorage.removeItem("clarify_pending_sop");
      setGenerating(true);

      const params = JSON.parse(pendingRaw);
      // Add efficiency profile to SOP generation
      const efficiencyProfile = getEfficiencyProfile();
      fetch("/api/generate-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, efficiencyProfile }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tasks) {
            saveTasks(today, data.tasks);
            setTasks(data.tasks);
          }
          setGenerating(false);
          setLoaded(true);
        })
        .catch(() => {
          setError("生成 SOP 失败，请重新规划");
          setGenerating(false);
          setLoaded(true);
        });
    } else {
      setTasks(getTasks(today));
      setLoaded(true);
    }
    document.title = "执行 · Clarify";
  }, []);

  // Persist tasks
  const persist = useCallback(
    (updatedTasks: Task[]) => {
      setTasks(updatedTasks);
      saveTasks(todayKey(), updatedTasks);
    },
    [],
  );

  // Toggle checkbox — record actual completion time
  function handleToggle(id: string) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: t.completed ? undefined : now }
        : t,
    );
    persist(updated);
  }

  // Drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    persist(reordered.map((t, i) => ({ ...t, orderIndex: i })));
  }

  // Add a manual task
  function handleAddTask() {
    if (!addTaskName.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: addTaskName.trim(),
      type: addTaskType,
      startTime: addTaskTime,
      durationMin: addTaskDuration,
      completed: false,
      orderIndex: tasks.length,
    };
    persist([...tasks, newTask]);
    setAddTaskName("");
    setAddTaskType("active");
    setAddTaskDuration(30);
    setAddTaskOpen(false);
  }

  // Save spark
  function handleSaveSpark() {
    if (!sparkText.trim()) return;
    saveSpark(todayKey(), sparkText.trim());
    setSparkText("");
    setSparkSaved(true);
    setTimeout(() => setSparkSaved(false), 2000);
  }

  // Replan
  async function handleReplan() {
    if (!adjustText.trim()) return;
    setReplanning(true);
    setReplanError(null);

    const ctx = getDailyContext(todayKey());

    try {
      const res = await fetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          changeContext: adjustText.trim(),
          energy: ctx?.energy ?? "normal",
          constraints: ctx?.constraints ?? "",
        }),
      });
      const data = await res.json();
      if (!data.tasks) throw new Error("无效响应");
      persist(data.tasks);
      setAdjustOpen(false);
      setAdjustText("");
    } catch {
      setReplanError("重新规划失败，请重试");
    } finally {
      setReplanning(false);
    }
  }

  // Progress
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const progress = total > 0 ? completed / total : 0;
  const allDone = total > 0 && completed === total;

  // ── Render ──────────────────────────────────────
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <NavHeader />

      <main className="pt-20">
        {/* ── Header ──────────────────────────────── */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <h2
              className="font-sans text-xl text-[#1A1A1A]"
              style={{ fontWeight: 500 }}
            >
              今日 SOP
            </h2>
            {loaded && total > 0 && (
              <span className="text-sm text-[#6C6863]">
                {completed} / {total}
              </span>
            )}
          </div>

          {loaded && total > 0 && (
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
          )}
        </div>

        {/* ── Generating state ────────────────────── */}
        {generating && (
          <div className="py-20 text-center">
            <p className="text-sm text-[#6C6863] font-serif italic animate-pulse-soft">
              AI 正在生成今日 SOP...
            </p>
          </div>
        )}

        {/* ── Error state ─────────────────────────── */}
        {error && (
          <div className="py-20 text-center">
            <p className="text-sm text-[#6C6863] font-serif italic">{error}</p>
            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={() => (window.location.href = "/")}
              >
                返回重新规划
              </Button>
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────── */}
        {loaded && !generating && !error && total === 0 && (
          <p className="text-sm text-[#6C6863] font-serif italic">
            还没有今天的任务，先去输入页规划吧。
          </p>
        )}

        {/* ── Task list ───────────────────────────── */}
        {loaded && !generating && !error && total > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* ── Add task ───────────────────────────── */}
        {loaded && !generating && !error && total > 0 && (
          <div className="mt-12">
            {!addTaskOpen ? (
              <button
                onClick={() => setAddTaskOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-[#1A1A1A]/20 text-sm text-[#6C6863] cursor-pointer hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
                style={{
                  transitionDuration: "500ms",
                  transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                }}
              >
                + 添加一个任务
              </button>
            ) : (
              <div className="bg-[#F9F8F6] border-t border-[#1A1A1A]/10 px-6 py-5 space-y-4">
                <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863]">
                  新任务
                </p>
                <input
                  type="text"
                  placeholder="任务名称"
                  value={addTaskName}
                  onChange={(e) => setAddTaskName(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#1A1A1A] border-b border-[#1A1A1A]/10 py-2 outline-none focus:border-[#D4AF37] transition-colors"
                  style={{
                    transitionDuration: "500ms",
                    transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[11px] text-[#6C6863] uppercase tracking-[0.08em] mb-1">类型</p>
                    <div className="flex gap-2">
                      {(["communication", "deep", "recovery", "active"] as TaskType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setAddTaskType(t)}
                          className={[
                            "text-[11px] px-3 py-1 uppercase tracking-[0.08em] border transition-all cursor-pointer",
                            addTaskType === t
                              ? "border-[#1A1A1A] text-[#1A1A1A]"
                              : "border-transparent text-[#6C6863] hover:text-[#1A1A1A]",
                          ].join(" ")}
                          style={{
                            transitionDuration: "500ms",
                            transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                          }}
                        >
                          {typeLabels[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-24">
                    <p className="text-[11px] text-[#6C6863] uppercase tracking-[0.08em] mb-1">时间</p>
                    <input
                      type="time"
                      value={addTaskTime}
                      onChange={(e) => setAddTaskTime(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#1A1A1A] border-b border-[#1A1A1A]/10 py-1 outline-none focus:border-[#D4AF37] transition-colors"
                      style={{
                        transitionDuration: "500ms",
                        transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      }}
                    />
                  </div>
                  <div className="w-20">
                    <p className="text-[11px] text-[#6C6863] uppercase tracking-[0.08em] mb-1">时长</p>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={addTaskDuration}
                      onChange={(e) => setAddTaskDuration(Number(e.target.value))}
                      className="w-full bg-transparent text-sm text-[#1A1A1A] border-b border-[#1A1A1A]/10 py-1 outline-none focus:border-[#D4AF37] transition-colors"
                      style={{
                        transitionDuration: "500ms",
                        transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setAddTaskOpen(false); setAddTaskName(""); }}
                    className="text-xs text-[#6C6863] cursor-pointer hover:text-[#1A1A1A] transition-all"
                    style={{
                      transitionDuration: "500ms",
                      transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    }}
                  >
                    取消
                  </button>
                  <Button variant="primary" onClick={handleAddTask} disabled={!addTaskName.trim()}>
                    添加 →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Dynamic adjustment ──────────────────── */}
        {loaded && !generating && !error && total > 0 && (
          <div className="mt-12">
            <button
              onClick={() => setAdjustOpen(!adjustOpen)}
              className="text-xs uppercase tracking-[0.1em] text-[#6C6863] cursor-pointer hover:text-[#1A1A1A] transition-all"
              style={{
                transitionDuration: "500ms",
                transitionTimingFunction:
                  "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              现实情况变了？
            </button>

            {adjustOpen && (
              <div className="mt-4 space-y-4">
                <Textarea
                  id="adjust"
                  placeholder="比如：被临时拉去开会，现在是12点..."
                  value={adjustText}
                  onChange={(e) => setAdjustText(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <Button variant="primary" onClick={handleReplan} disabled={!adjustText.trim() || replanning}>
                  {replanning ? "重新规划中..." : "重新规划剩余任务 →"}
                </Button>
                {replanError && (
                  <p className="text-xs text-[#6C6863] font-serif italic">{replanError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Spark entry ─────────────────────────── */}
        {loaded && !generating && !error && (
          <div className="mt-16 border-t border-[#1A1A1A]/10 pt-6">
            {!sparkOpen && !sparkSaved && (
              <button
                onClick={() => setSparkOpen(true)}
                className="w-full flex items-center gap-3 py-3 text-sm text-[#6C6863] cursor-pointer hover:text-[#1A1A1A] transition-all border-b border-transparent hover:border-[#D4AF37]"
                style={{
                  transitionDuration: "500ms",
                  transitionTimingFunction:
                    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                记录一个火花
              </button>
            )}

            {sparkSaved && (
              <div className="flex items-center gap-2 py-3 animate-fade-in">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8.5L6.5 12L13 5"
                    stroke="#D4AF37"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="24"
                    strokeDashoffset="24"
                    className="animate-draw-check"
                  />
                </svg>
                <span className="text-sm text-[#6C6863] font-serif italic">
                  已记录
                </span>
              </div>
            )}

            {sparkOpen && !sparkSaved && (
              <div className="space-y-4">
                <Textarea
                  id="spark"
                  placeholder="突然想到什么？记下来..."
                  value={sparkText}
                  onChange={(e) => setSparkText(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSaveSpark}
                    disabled={!sparkText.trim()}
                  >
                    记下来 →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
