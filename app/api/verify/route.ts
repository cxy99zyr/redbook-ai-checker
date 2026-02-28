import { NextRequest, NextResponse } from "next/server"
import { extractJSON } from "@/lib/utils"
import { VERIFY_PROMPT, SIMPLE_POLISH_PROMPT } from "@/lib/constants"

export async function POST(req: NextRequest) {
  try {
    const { params, title, content, apiKey, endpoint, model } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 })
    }

    if (!title?.trim() && !content?.trim()) {
      return NextResponse.json(
        { error: "请输入标题或正文" },
        { status: 400 }
      )
    }

    // 如果有参数，使用校核模式；否则使用润色模式
    const hasParams = params && Object.keys(params).length > 0
    const prompt = hasParams
      ? VERIFY_PROMPT
          .replace("{{PARAMS}}", JSON.stringify(params, null, 2))
          .replace("{{TITLE}}", title || "（无标题）")
          .replace("{{CONTENT}}", content || "（无正文）")
      : SIMPLE_POLISH_PROMPT
          .replace("{{TITLE}}", title || "（无标题）")
          .replace("{{CONTENT}}", content || "（无正文）")

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
        max_tokens: 2000,
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
    const responseContent = data.choices?.[0]?.message?.content

    if (!responseContent) {
      return NextResponse.json(
        { error: "AI 未返回有效内容" },
        { status: 500 }
      )
    }

    const result = extractJSON(responseContent)
    return NextResponse.json({ result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "校核失败，请重试"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
