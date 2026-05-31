# Clarify — 项目当前状态 (2026-05-31)

## 项目概述

Clarify（原名心流伴侣）是一个任务管理 SPA，帮助用户从混乱的日常输入中生成清晰的 SOP（标准作业流程），并跟踪执行与复盘。Next.js 14 App Router，纯前端，localStorage 存储。

## 技术栈

- **框架**: Next.js 14.2.35 (App Router), React 18
- **样式**: Tailwind CSS v4 (`@import "tailwindcss"`, `@theme` 自定义 tokens, `@tailwindcss/postcss` 插件, 无 tailwind.config.ts)
- **字体**: Playfair Display (serif, italic 变体) + Inter (sans), 通过 `next/font/google` 加载
- **AI**: DeepSeek API (OpenAI-compatible SDK `openai` npm 包, baseURL: `https://api.deepseek.com`, model: `deepseek-chat`, 使用 `response_format: { type: "json_object" }`)
- **拖拽**: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- **存储**: localStorage (date-keyed 模式, 无后端)
- **构建**: `npm run build` (本地 next build), 无 CI/CD

## 设计系统

### 设计 tokens (`lib/design-tokens.ts`)

```ts
colors: { bg: "#F9F8F6", fg: "#1A1A1A", muted: "#6C6863", accent: "#D4AF37", surface: "#EBE5DE", border: "rgb(26 26 26 / 0.1)", borderStrong: "rgb(26 26 26 / 0.2)" }
fonts: { serif: "Playfair Display", sans: "Inter" }
easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
durations: { fast: "500ms", image: "1500ms", imageSlow: "2000ms" }
tracking: { label: "0.1em", wide: "0.12em" }
```

### Tailwind 自定义主题 (`app/globals.css`)

`@theme` 定义了 `--color-bg/fg/muted/accent/surface/border`, `--font-serif/sans`, `--ease-editorial`。

### 核心设计约束

- 零圆角 (`border-radius: 0`)
- 所有过渡动画最小 500ms，使用 `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 金色 `#D4AF37` 仅用于关键强调时刻
- 卡片模式：`border-t` 顶部边框 + `bg-[#F9F8F6]`
- 输入框样式：底部边框 `border-b`, focus 变金色

## 数据模型 (`lib/types.ts`)

### Task (任务)
```ts
type TaskType = "communication" | "deep" | "recovery" | "active"
interface Task {
  id: string           // UUID
  name: string         // 任务名
  type: TaskType       // 类型
  startTime: string    // "HH:mm"
  durationMin: number  // 预估分钟
  completed: boolean   // 是否完成
  orderIndex: number   // 排序
}
```

类型含义：`communication` 沟通(上午), `deep` 深度工作(高峰时段), `recovery` 恢复(间隙/下午), `active` 进行中(金色底部边框标签)

### Spark (火花/想法)
```ts
interface Spark {
  id: string
  content: string       // 内容
  worthFollowing: boolean  // 值得跟进？
  createdAt: string     // ISO timestamp
}
```

### DailyContext (每日上下文)
```ts
interface DailyContext {
  energy: "high" | "normal" | "low"
  constraints: string         // 硬约束文本
  rawInput: string            // 用户原始输入
  reflection?: string         // 复盘反思
  aiSummary?: string          // AI 生成的摘要 (JSON)
}
```

### AI 问答类型
```ts
interface AIQuestion { taskName: string; question: string }
interface ClarifyResponse { questions: AIQuestion[]; clearTasks: string[] }
interface ClarifyResult { questions: (AIQuestion & { answer: string })[]; clearTasks: string[] }
```

## 存储层 (`lib/storage.ts`)

统一的 localStorage 封装，方便后期替换为 Supabase（只需改此文件）。

Key 模式:
- `clarify_tasks_{date}` → Task[]
- `clarify_sparks_{date}` → Spark[]
- `clarify_context_{date}` → DailyContext

函数签名:
```ts
getTasks(date: string): Task[]
saveTasks(date: string, tasks: Task[]): void
getSparks(date: string): Spark[]
saveSpark(date: string, content: string): void
getDailyContext(date: string): DailyContext | null
saveDailyContext(date: string, context: DailyContext): void
```

跨页面通信: `localStorage.clarify_pending_sop` — 输入页写入 pending params，执行页读取后删除。

## UI 组件

### `components/ui/Button.tsx`
- variants: `primary` (黑色背景, 金色滑动遮罩 hover), `secondary` (透明, 边框, hover 反色)
- 基础样式: `px-8 py-3 text-sm uppercase tracking-[0.1em]`

### `components/ui/Input.tsx` + `Textarea`
- 底部边框 `border-b` 样式, focus 变金色
- placeholder: serif italic
- Textarea: `resize-none`

### `components/ui/Chip.tsx` (ChipGroup)
- 水平排列按钮组, 选中时金色底部边框
- 用于精力状态选择 (high/normal/low)

### `components/ui/Card.tsx`
- `bg-[#F9F8F6]`, `border-t`, `px-6 py-5`
- 广泛用于展示区域

### `components/NavHeader.tsx`
- 顶部导航, path-based active 检测
- Logo: "Clarify" Playfair Display italic, 链接到 `/`
- 标签页: 输入(`/`), 执行(`/exec`), 复盘(`/review`)
- Active 标签: 金色 `border-b-2 border-[#D4AF37]`
- Hover: 非 active 标签 hover 变金色 `#D4AF37`, 500ms 过渡

## 页面

### 1. 输入页 (`app/page.tsx`) — 首页 `/`

**三阶段流程:**

1. **Idle**: 文本区输入今日任务 + 精力状态 (ChipGroup) + 硬约束输入
2. **Loading**: 调用 `/api/clarify` → "思考中..." 
3. **Asking**: 展示 AI 追问 (question cards + answer inputs) + 已清晰任务列表 + "跳过，直接生成" / "确认，生成 SOP →"

**handleGenerate(skip)**: 
- 收集 answers payload
- 保存 DailyContext 到 localStorage
- 将 pending params 写入 `localStorage.clarify_pending_sop`
- 立即 `router.push("/exec")` — 不等待 API

### 2. 执行页 (`app/exec/page.tsx`) — `/exec`

**挂载逻辑:**
1. 检查 `localStorage.clarify_pending_sop` → 调用 `/api/generate-sop`，显示 "AI 正在生成今日 SOP..." 加载状态
2. 无 pending → 从 `getTasks(todayKey())` 加载

**功能:**
- **任务列表**: SortableTask 组件 (checkbox + 任务名 + 时间/时长 + 类型标签)
  - Checkbox: 1px border, 完成时黑色背景 + SVG 勾, 500ms 过渡
  - active 类型: 金色 `border-b border-[#D4AF37]`
  - 拖拽排序: DndContext + SortableContext + useSortable, PointerSensor distance=8
  - 拖拽时阴影效果
- **进度条**: 1px 高, `bg-[#EBE5DE]`, fill `#1A1A1A` (全完成时金色 `#D4AF37`), 700ms 过渡
- **动态调整**: 可折叠 "现实情况变了？" → textarea + "重新规划剩余任务 →" 按钮 (未接入 API)
- **火花记录**: "记录一个火花" → 展开 textarea + "记下来 →" 按钮 → 调用 `saveSpark()`

### 3. 复盘页 (`app/review/page.tsx`) — **尚未创建** (Step 4 内容)

## API 路由

### `app/api/clarify/route.ts` — POST `/api/clarify`
- **输入**: `{ rawInput, energy, constraints }`
- **功能**: 分析用户输入，识别模糊任务，生成追问 + 清晰任务列表
- **返回**: `{ questions: AIQuestion[], clearTasks: string[] }`

### `app/api/generate-sop/route.ts` — POST `/api/generate-sop`
- **输入**: `{ rawInput, answers, energy, constraints }`
- **功能**: 根据澄清后的内容生成排期 SOP
- **规则**: communication 排上午, deep 排高峰, recovery 排间隙, 硬约束不可排
- **返回**: `{ tasks: Task[] }`

## 跨页面流程

```
输入页                           执行页
─────                           ─────
用户输入 → /api/clarify          挂载
  → Asking 阶段                   ├─ 有 pending_sop? → 调 /api/generate-sop
  → 确认生成                       │   显示 loading → 保存 tasks
    ├─ 存 DailyContext             │   错误 → 显示重试按钮
    ├─ 存 pending_sop             └─ 无 pending → 直接加载 tasks
    └─ router.push("/exec") ──→  
```

## 环境变量

`.env.local`: `DEEPSEEK_API_KEY=sk-3de7650232694830ae493621d4ee7d32`

## 构建信息

- `npm run build` 通过
- 当前路由 bundle:
  - `/` (输入页): 3.33kB
  - `/exec` (执行页): 19.2kB (含 @dnd-kit)
  - `/api/clarify`, `/api/generate-sop`: 动态 (dynamic)

## 待完成 (Step 4)

1. **`/api/replan` 路由** — 动态重规划剩余未完成任务 (给定当前时间、已完成任务列表、变化描述)
2. **复盘页 `app/review/page.tsx`** — 查看历史任务、火花记录、每日反思
3. **执行页动态调整按钮接线** — "重新规划剩余任务 →" 调用 `/api/replan`
4. 复盘页导航集成 (NavHeader 已有 `/review` 标签但会 404)

## Git

- 仓库: `git@github.com:syingwang1-dotcom/mindflow.git` (与旧项目共用)
- GitHub Pages: https://syingwang1-dotcom.github.io/mindflow/
- SSH 通过代理 (127.0.0.1:7890)
