import { NextRequest, NextResponse } from "next/server"
import { extractJSON } from "@/lib/utils"
import { STYLE_TRANSFER_PROMPT } from "@/lib/constants"

export async function POST(req: NextRequest) {
  try {
    const {
      originalTitle,
      originalContent,
      refTitle,
      refContent,
      userDirection,
      apiKey,
      endpoint,
      model,
    } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 })
    }

    if (!originalContent?.trim()) {
      return NextResponse.json(
        { error: "请输入原始文案正文" },
        { status: 400 }
      )
    }

    if (!refContent?.trim()) {
      return NextResponse.json(
        { error: "请输入参考文案正文" },
        { status: 400 }
      )
    }

    const prompt = STYLE_TRANSFER_PROMPT
      .replace("{{ORIGINAL_TITLE}}", originalTitle || "（无标题）")
      .replace("{{ORIGINAL_CONTENT}}", originalContent)
      .replace("{{REF_TITLE}}", refTitle || "（无标题）")
      .replace("{{REF_CONTENT}}", refContent)
      .replace(
        "{{USER_DIRECTION}}",
        userDirection?.trim() || "无特别要求，按参考文案风格迁移即可"
      )

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
        max_tokens: 3000,
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

    console.log("[style-transfer] AI 返回内容:", responseContent)

    const result = extractJSON(responseContent) as {
      style_analysis?: string
      transferred_titles?: string[]
      transferred_content?: string
    }

    if (!result.transferred_titles?.length || !result.transferred_content) {
      console.log("[style-transfer] 解析结果:", result)
      return NextResponse.json(
        { error: "AI 未能生成有效的风格迁移文案" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      result: {
        style_analysis: result.style_analysis || "",
        transferred_titles: result.transferred_titles,
        transferred_content: result.transferred_content,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "风格迁移失败，请重试"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
