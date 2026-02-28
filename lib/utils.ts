import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract JSON from AI response text, handling markdown code blocks
 */
export function extractJSON(text: string): unknown {
  const trimmed = text.trim()

  // Direct parse
  try {
    return JSON.parse(trimmed)
  } catch {}

  // Extract from ```json ... ``` code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {}
  }

  // Find first JSON object
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
  }

  throw new Error("无法解析AI返回的数据，请重试")
}
