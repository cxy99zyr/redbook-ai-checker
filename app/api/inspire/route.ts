import { NextRequest, NextResponse } from "next/server"
import { extractJSON } from "@/lib/utils"
import {
  INSPIRE_PROMPT,
  SIMPLE_INSPIRE_PROMPT,
  getDirectionByKey,
} from "@/lib/constants"

export async function POST(req: NextRequest) {
  try {
    const { params, title, content, direction, apiKey, endpoint, model } =
      await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 })
    }

    if (!direction) {
      return NextResponse.json({ error: "请选择润色方向" }, { status: 400 })
    }

    const directionInfo = getDirectionByKey(direction)
    if (!directionInfo) {
      return NextResponse.json({ error: "无效的润色方向" }, { status: 400 })
    }

    // 如果有参数使用完整 prompt，否则使用简化版
    const hasParams = params && Object.keys(params).length > 0
    const promptTemplate = hasParams ? INSPIRE_PROMPT : SIMPLE_INSPIRE_PROMPT
    const prompt = promptTemplate
      .replace("{{PARAMS}}", JSON.stringify(params || {}, null, 2))
      .replace("{{TITLE}}", title || "（无标题）")
      .replace("{{CONTENT}}", content || "（无正文）")
      .replace("{{DIRECTION_LABEL}}", directionInfo.label)
      .replace("{{DIRECTION_DESC}}", directionInfo.description)

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 1500,
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

    // 调试：打印原始返回内容
    console.log("[inspire] AI 返回内容:", responseContent)

    const result = extractJSON(responseContent) as {
      inspirations?: string[]
    }

    if (
      !result.inspirations ||
      !Array.isArray(result.inspirations) ||
      result.inspirations.length === 0
    ) {
      console.log("[inspire] 解析结果:", result)
      return NextResponse.json(
        { error: "AI 未能生成有效灵感" },
        { status: 500 }
      )
    }

    return NextResponse.json({ inspirations: result.inspirations })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "灵感生成失败，请重试"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
