import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

export async function POST(req: NextRequest) {
  const { rawInput, answers, energy, constraints, efficiencyProfile } = await req.json();

  const systemPrompt = `你是一个任务规划助手。根据用户今天的任务、
澄清后的细节、当前状态和硬约束，生成一份今日 SOP。

规则：
1. 沟通类任务（联系、回复、开会）排在上午前段，趁精力好
2. 深度工作（写作、分析、设计）排在精力高峰时段
3. 恢复类（健身、休息）排在任务间隙或下午
4. 每个任务必须有开始时间和预估时长
5. 硬约束时间段不能安排任务
6. 任务类型只能是：communication / deep / recovery / active
7. 参考用户的效率数据来合理安排任务量：${efficiencyProfile || "暂无历史数据"}

返回严格的 JSON 格式，不要有任何多余文字：
{
  "tasks": [
    {
      "id": "uuid字符串",
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
原始任务：${rawInput}
今日状态：${energy}
硬约束：${constraints}
澄清细节：${JSON.stringify(answers)}
`;

  const client = getClient();
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
