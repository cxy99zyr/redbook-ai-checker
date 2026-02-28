import { NextRequest, NextResponse } from "next/server"
import { extractJSON } from "@/lib/utils"
import { 
  POLISH_PROMPT, 
  SIMPLE_POLISH_PROMPT, 
  getDirectionByKey, 
  getTemplateByKey,
  PolishDirectionKey 
} from "@/lib/constants"

// 构建结构模板字符串
function buildStructureTemplate(key: PolishDirectionKey): string {
  const template = getTemplateByKey(key)
  if (!template) return ""

  let result = `你必须按照以下结构组织文案：\n\n`
  
  template.structure.forEach((section, index) => {
    result += `### ${index + 1}. ${section}\n`
    result += `${template.structureDesc[index]}\n\n`
  })

  result += `\n## 参考示例\n${template.example}`
  
  return result
}

export async function POST(req: NextRequest) {
  try {
    const {
      params,
      title,
      content,
      direction,
      inspiration,
      apiKey,
      endpoint,
      model,
    } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 })
    }

    if (!direction) {
      return NextResponse.json({ error: "请选择润色方向" }, { status: 400 })
    }

    if (!inspiration) {
      return NextResponse.json({ error: "请选择一条灵感" }, { status: 400 })
    }

    const directionInfo = getDirectionByKey(direction)
    if (!directionInfo) {
      return NextResponse.json({ error: "无效的润色方向" }, { status: 400 })
    }

    // 如果有参数使用完整 prompt，否则使用简化版
    const hasParams = params && Object.keys(params).length > 0
    const promptTemplate = hasParams ? POLISH_PROMPT : SIMPLE_POLISH_PROMPT
    
    // 构建结构模板
    const structureTemplate = buildStructureTemplate(direction as PolishDirectionKey)
    
    const prompt = promptTemplate
      .replace("{{PARAMS}}", JSON.stringify(params || {}, null, 2))
      .replace("{{TITLE}}", title || "（无标题）")
      .replace("{{CONTENT}}", content || "（无正文）")
      .replace("{{DIRECTION_LABEL}}", directionInfo.label)
      .replace("{{DIRECTION_DESC}}", directionInfo.description)
      .replace("{{INSPIRATION}}", inspiration)
      .replace("{{STRUCTURE_TEMPLATE}}", structureTemplate)

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,  // 提高创造性，支持真正的重构
        max_tokens: 3000,  // 增加token上限，支持更长的重构文案
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
    console.log("[polish] AI 返回内容:", responseContent)

    const result = extractJSON(responseContent) as {
      polished_titles?: string[]
      polished_content?: string
      corrected_title?: string
      corrected_content?: string
    }

    // 兼容两种返回格式
    const polishedTitles = result.polished_titles || (result.corrected_title ? [result.corrected_title] : [])
    const polishedContent = result.polished_content || result.corrected_content || ""

    if (!polishedTitles.length || !polishedContent) {
      console.log("[polish] 解析结果:", result)
      return NextResponse.json(
        { error: "AI 未能生成有效润色文案" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      result: {
        polished_titles: polishedTitles,
        polished_content: polishedContent,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "润色生成失败，请重试"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
