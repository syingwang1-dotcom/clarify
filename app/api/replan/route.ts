import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: NextRequest) {
  const { tasks, changeContext, energy, constraints } = await req.json();

  const systemPrompt = `你是一个动态任务调整助手。用户原本有一份今日 SOP，但现在情况发生了变化，需要重新规划剩余任务。

规则：
1. 已完成的任务（completed: true）保留不动，不要更改它们的时间
2. 未完成的任务根据变化描述重新排序和分配时间
3. 沟通类任务（联系、回复、开会）排在上午前段
4. 深度工作（写作、分析、设计）排在精力高峰时段
5. 恢复类（健身、休息）排在任务间隙或下午
6. 硬约束时间段不能安排任务
7. 每个任务必须有开始时间和预估时长
8. 任务类型只能是：communication / deep / recovery / active
9. 当前时间之前的时段不能安排未完成任务

返回严格的 JSON 格式，不要有任何多余文字：
{
  "tasks": [
    {
      "id": "原 id",
      "name": "任务名",
      "type": "communication",
      "startTime": "09:00",
      "durationMin": 30,
      "completed": false,
      "orderIndex": 0
    }
  ]
}`;

  const userContent = `
当前所有任务：${JSON.stringify(tasks)}
变化描述：${changeContext}
今日状态：${energy}
硬约束：${constraints}
`;

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content ?? "{}");
  return NextResponse.json(result);
}
