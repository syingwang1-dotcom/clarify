"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Input";
import { ChipGroup } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { getDailyContext, saveDailyContext } from "@/lib/storage";
import type {
  DailyContext,
  ClarifyResponse,
  AIQuestion,
} from "@/lib/types";

type Phase = "idle" | "loading" | "asking";

const energyOptions = [
  { label: "精力充沛", value: "high" },
  { label: "一般", value: "normal" },
  { label: "疲惫", value: "low" },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const w = weekdays[now.getDay()];
  return `${y}年${m}月${d}日 ${w}`;
}

export default function Home() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [energy, setEnergy] = useState<string | null>(null);
  const [constraints, setConstraints] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [clearTasks, setClearTasks] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Load today's context on mount
  useEffect(() => {
    const ctx = getDailyContext(todayKey());
    if (!ctx) return;
    if (ctx.rawInput) setRawInput(ctx.rawInput);
    if (ctx.energy) setEnergy(ctx.energy);
    if (ctx.constraints) setConstraints(ctx.constraints);
  }, []);

  // ── Clarify API ──────────────────────────────────
  async function handleClarify() {
    setPhase("loading");
    const res = await fetch("/api/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawInput: rawInput.trim(),
        energy: energy ?? "normal",
        constraints: constraints.trim(),
      }),
    });
    const data: ClarifyResponse = await res.json();
    setQuestions(data.questions ?? []);
    setClearTasks(data.clearTasks ?? []);
    setAnswers({});
    setPhase("asking");
  }

  // ── Generate SOP ──────────────────────────────────
  async function handleGenerate(skip: boolean) {
    const answersPayload = skip
      ? questions.map((q) => ({ ...q, answer: "" }))
      : questions.map((q, i) => ({ ...q, answer: answers[i] ?? "" }));

    // Save daily context
    const ctx: DailyContext = {
      energy: (energy as "high" | "normal" | "low") ?? "normal",
      constraints: constraints.trim(),
      rawInput: rawInput.trim(),
      aiSummary: JSON.stringify({ questions: answersPayload, clearTasks }),
    };
    saveDailyContext(todayKey(), ctx);

    // Save pending SOP generation params for /exec to consume
    localStorage.setItem(
      "clarify_pending_sop",
      JSON.stringify({
        rawInput: rawInput.trim(),
        answers: answersPayload,
        energy: energy ?? "normal",
        constraints: constraints.trim(),
      }),
    );

    router.push("/exec");
  }

  // ── Render ────────────────────────────────────────
  return (
    <div className="min-h-screen max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <NavHeader />

      <main className="pt-20">
        {/* Page header */}
        <div className="mb-16">
          <p className="font-serif italic text-[#6C6863] text-sm mb-2">
            {formatDate()}
          </p>
          <h2 className="font-serif text-4xl text-[#1A1A1A]">今日规划</h2>
        </div>

        {/* ── idle / loading ──────────────────────── */}
        {(phase === "idle" || phase === "loading") && (
          <>
            <div className="grid grid-cols-12 gap-x-16 gap-y-16">
              <div className="col-span-7 space-y-12">
                <Textarea
                  id="tasks"
                  label="把今天要做的事都倒进来"
                  placeholder="把今天要做的事都倒进来，可以很乱"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={8}
                  className="text-base"
                  disabled={phase === "loading"}
                />
              </div>
              <div className="col-span-5 space-y-16">
                <div>
                  <p className="mb-4 text-xs uppercase tracking-[0.1em] text-[#6C6863]">
                    今日状态
                  </p>
                  <ChipGroup
                    options={energyOptions}
                    value={energy}
                    onChange={setEnergy}
                  />
                </div>
                <Input
                  id="constraints"
                  label="硬约束"
                  placeholder="例：下午3点有会议，晚上要接小孩"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  disabled={phase === "loading"}
                />
              </div>
            </div>

            <div className="mt-20 flex items-center gap-6">
              <Button
                variant="primary"
                onClick={handleClarify}
                disabled={phase === "loading" || !rawInput.trim()}
              >
                {phase === "loading" ? "思考中..." : "开始规划 →"}
              </Button>
            </div>
          </>
        )}

        {/* ── asking ──────────────────────────────────── */}
        {phase === "asking" && (
          <>
            <Card className="mb-12">
              <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-2">
                你的输入
              </p>
              <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-line">
                {rawInput.trim()}
              </p>
              {energy && (
                <p className="text-xs text-[#6C6863] mt-2">
                  状态：{energyOptions.find((o) => o.value === energy)?.label}
                  {constraints.trim() && `  ·  约束：${constraints.trim()}`}
                </p>
              )}
            </Card>

            {questions.length > 0 && (
              <div className="space-y-8 mb-16">
                <p className="font-serif italic text-[#6C6863] text-sm">
                  AI 想进一步了解以下任务
                </p>
                {questions.map((q, i) => (
                  <Card key={i}>
                    <p className="text-xs uppercase tracking-[0.1em] text-[#6C6863] mb-3">
                      {q.taskName}
                    </p>
                    <p className="font-serif italic text-[#1A1A1A] text-base leading-relaxed mb-4">
                      {q.question}
                    </p>
                    <Input
                      id={`answer-${i}`}
                      placeholder="输入你的回答"
                      value={answers[i] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [i]: e.target.value,
                        }))
                      }
                    />
                  </Card>
                ))}
              </div>
            )}

            {clearTasks.length > 0 && (
              <div className="mb-16">
                <p className="font-serif italic text-[#6C6863] text-sm mb-4">
                  已清晰的任务
                </p>
                <div className="space-y-2">
                  {clearTasks.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm text-[#1A1A1A]"
                    >
                      <span className="text-[#D4AF37]">✓</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questions.length === 0 && clearTasks.length === 0 && (
              <p className="text-sm text-[#6C6863] font-serif italic mb-16">
                所有任务都很清晰，可以直接生成 SOP。
              </p>
            )}

            <div className="flex items-center gap-6">
              <Button variant="secondary" onClick={() => handleGenerate(true)}>
                跳过，直接生成
              </Button>
              <Button variant="primary" onClick={() => handleGenerate(false)}>
                确认，生成 SOP →
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
