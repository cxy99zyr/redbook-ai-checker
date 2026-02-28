import { NextRequest, NextResponse } from "next/server"
import { extractJSON } from "@/lib/utils"
import { PARSE_PROMPT } from "@/lib/constants"

export async function POST(req: NextRequest) {
  try {
    const { text, apiKey, endpoint, model } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 })
    }

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "请输入参数文本" },
        { status: 400 }
      )
    }

    const prompt = PARSE_PROMPT + text

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      let errMsg = `API 请求失败 (${res.status})`
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson.error?.message || errMsg
      } catch {}
      return NextResponse.json({ error: errMsg }, { status: res.status })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "AI 未返回有效内容" },
        { status: 500 }
      )
    }

    const params = extractJSON(content)
    return NextResponse.json({ params })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "参数解析失败，请重试"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
