import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

export async function POST(req: NextRequest) {
  const { rawInput, energy, constraints } = await req.json();

  const systemPrompt = `你是一个任务规划助手。用户会给你一段今天要做的事情的原始输入，
可能很模糊或口语化。

你的任务是：
1. 识别其中模糊、缺少信息的任务（比如没有DDL、不知道工作量的）
2. 针对这些任务生成追问，每个追问要简短、口语化
3. 已经足够清晰的任务不需要追问

返回严格的 JSON 格式，不要有任何多余文字：
{
  "questions": [
    {
      "taskName": "写报告",
      "question": "报告大概多少字？有截止时间吗？"
    }
  ],
  "clearTasks": ["健身", "回邮件"]
}`;

  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `今日任务：${rawInput}\n状态：${energy}\n硬约束：${constraints}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content ?? "{}");
  return NextResponse.json(result);
}
