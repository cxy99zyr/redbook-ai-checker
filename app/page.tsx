"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  PARAM_CATEGORIES,
  CATEGORY_STYLE,
  getCategoryForParam,
  POLISH_DIRECTIONS,
  type PolishDirectionKey,
} from "@/lib/constants"
import {
  Settings,
  Upload,
  FileText,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileSpreadsheet,
  ClipboardCheck,
  Eye,
  EyeOff,
  Sparkles,
  Wand2,
  Lightbulb,
  ArrowRight,
  CornerDownRight,
  RefreshCw,
} from "lucide-react"

/* ─── Types ─────────────────────────────────────────────── */

interface ParsedParams {
  [key: string]: string
}

interface VerificationError {
  position: string
  param: string
  wrong_value: string
  correct_value: string
}

interface VerificationResult {
  has_error: boolean
  error_list: VerificationError[]
  corrected_title: string
  corrected_content: string
}

interface PolishedResult {
  polished_titles: string[]
  polished_content: string
}

interface ApiConfig {
  apiKey: string
  endpoint: string
  model: string
}

const API_CONFIG_KEY = "redbook-ai-config"

const DEEPSEEK_MODELS = {
  chat: {
    name: "Chat",
    model: "deepseek-chat",
    description: "通用对话模型，适合大多数任务",
  },
  reasoner: {
    name: "Reasoner",
    model: "deepseek-reasoner",
    description: "推理模型，适合复杂逻辑分析",
  },
} as const

type DeepseekModelKey = keyof typeof DEEPSEEK_MODELS

const API_PROVIDERS = {
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: DEEPSEEK_MODELS.chat.model,
  },
} as const

type ProviderKey = keyof typeof API_PROVIDERS
const DEFAULT_PROVIDER: ProviderKey = "deepseek"

/* ─── Main Component ────────────────────────────────────── */

export default function Home() {
  /* ─── Top-level Tab ─── */
  const [activeMainTab, setActiveMainTab] = useState<"verify" | "polish">(
    "verify"
  )

  /* ─── API Config ─── */
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiKey: "",
    endpoint: API_PROVIDERS[DEFAULT_PROVIDER].endpoint,
    model: API_PROVIDERS[DEFAULT_PROVIDER].model,
  })
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  /* ─── Step 1: Parameters (shared) ─── */
  const [activeTab, setActiveTab] = useState<"text" | "excel">("text")
  const [paramText, setParamText] = useState("")
  const [parsedParams, setParsedParams] = useState<ParsedParams | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState("")

  /* ─── Verify Tab: Copy Input ─── */
  const [copyTitle, setCopyTitle] = useState("")
  const [copyContent, setCopyContent] = useState("")

  /* ─── Verify Tab: Results ─── */
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [verifyError, setVerifyError] = useState("")

  /* ─── Polish Tab: Input ─── */
  const [polishTitle, setPolishTitle] = useState("")
  const [polishContent, setPolishContent] = useState("")
  const [polishDirection, setPolishDirection] = useState<string>("")

  /* ─── Polish Tab: Inspirations ─── */
  const [inspirations, setInspirations] = useState<string[]>([])
  const [selectedInspiration, setSelectedInspiration] = useState<number | null>(
    null
  )
  const [isGeneratingInspirations, setIsGeneratingInspirations] =
    useState(false)
  const [inspireError, setInspireError] = useState("")

  /* ─── Polish Tab: Polished Result ─── */
  const [polishedResult, setPolishedResult] = useState<PolishedResult | null>(
    null
  )
  const [isGeneratingPolish, setIsGeneratingPolish] = useState(false)
  const [polishError, setPolishError] = useState("")

  /* ─── Copy feedback ─── */
  const [copiedField, setCopiedField] = useState<string | null>(null)

  /* ─── Refs ─── */
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const polishResultRef = useRef<HTMLDivElement>(null)
  const prevMainTab = useRef(activeMainTab)

  /* ─── Auto-sync polish inputs when switching tabs ─── */
  useEffect(() => {
    if (activeMainTab === "polish" && prevMainTab.current !== "polish") {
      // Switching TO polish tab - sync from verify tab
      setPolishTitle(copyTitle)
      setPolishContent(copyContent)
    }
    prevMainTab.current = activeMainTab
  }, [activeMainTab, copyTitle, copyContent])

  /* ─── Load saved config ─── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(API_CONFIG_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ApiConfig
        setApiConfig(parsed)
        if (!parsed.apiKey) setShowApiConfig(true)
      } else {
        setShowApiConfig(true)
      }
    } catch {
      setShowApiConfig(true)
    }
  }, [])

  /* ─── Save config ─── */
  const saveConfig = useCallback((config: ApiConfig) => {
    setApiConfig(config)
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
  }, [])

  /* ─── Handlers: Parse Parameters ─── */
  const handleParseParams = async () => {
    if (!apiConfig.apiKey) {
      setShowApiConfig(true)
      setParseError("请先配置 API Key")
      return
    }
    if (!paramText.trim()) {
      setParseError("请输入参数文本")
      return
    }

    setIsParsing(true)
    setParseError("")
    setParsedParams(null)

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: paramText,
          apiKey: apiConfig.apiKey,
          endpoint: apiConfig.endpoint,
          model: apiConfig.model,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const filtered: ParsedParams = {}
      for (const [key, value] of Object.entries(
        data.params as Record<string, string>
      )) {
        if (value && String(value).trim()) {
          filtered[key] = String(value)
        }
      }

      if (Object.keys(filtered).length === 0) {
        throw new Error("未从文本中识别到任何参数，请检查输入内容")
      }

      setParsedParams(filtered)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "解析失败，请重试")
    } finally {
      setIsParsing(false)
    }
  }

  /* ─── Handlers: Excel Upload ─── */
  const handleExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const XLSX = await import("xlsx")
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result
          const wb = XLSX.read(data, { type: "binary" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })

          const lines = json
            .filter((row) => row[0] && row[1])
            .map((row) => `${row[0]}: ${row[1]}`)
            .join("\n")

          if (!lines) {
            setParseError(
              "Excel 中未找到有效数据（需要两列：参数名 | 参数值）"
            )
            return
          }

          setParamText(lines)
          setActiveTab("text")
          setParseError("")
        } catch {
          setParseError("Excel 解析失败，请检查文件格式")
        }
      }
      reader.readAsBinaryString(file)
    } catch {
      setParseError("无法加载 Excel 解析库")
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  /* ─── Handlers: Verify ─── */
  const handleVerify = async () => {
    if (!apiConfig.apiKey) {
      setShowApiConfig(true)
      setVerifyError("请先配置 API Key")
      return
    }
    if (!copyTitle.trim() && !copyContent.trim()) {
      setVerifyError("请输入标题或正文")
      return
    }

    setIsVerifying(true)
    setVerifyError("")
    setResult(null)

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: parsedParams || {},
          title: copyTitle,
          content: copyContent,
          apiKey: apiConfig.apiKey,
          endpoint: apiConfig.endpoint,
          model: apiConfig.model,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setResult(data.result as VerificationResult)

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 100)
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "校核失败，请重试")
    } finally {
      setIsVerifying(false)
    }
  }

  /* ─── Handlers: Generate Inspirations ─── */
  const handleGenerateInspirations = async () => {
    if (!apiConfig.apiKey) {
      setShowApiConfig(true)
      setInspireError("请先配置 API Key")
      return
    }
    if (!polishDirection) {
      setInspireError("请选择润色方向")
      return
    }

    setIsGeneratingInspirations(true)
    setInspireError("")
    setInspirations([])
    setSelectedInspiration(null)
    setPolishedResult(null)

    try {
      const res = await fetch("/api/inspire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: parsedParams || {},
          title: polishTitle,
          content: polishContent,
          direction: polishDirection,
          apiKey: apiConfig.apiKey,
          endpoint: apiConfig.endpoint,
          model: apiConfig.model,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setInspirations(data.inspirations)
    } catch (err) {
      setInspireError(
        err instanceof Error ? err.message : "灵感生成失败，请重试"
      )
    } finally {
      setIsGeneratingInspirations(false)
    }
  }

  /* ─── Handlers: Generate Polished Copy ─── */
  const handleGeneratePolish = async () => {
    if (!apiConfig.apiKey) {
      setShowApiConfig(true)
      setPolishError("请先配置 API Key")
      return
    }
    if (selectedInspiration === null) {
      setPolishError("请先选择一条灵感")
      return
    }

    setIsGeneratingPolish(true)
    setPolishError("")
    setPolishedResult(null)

    try {
      const res = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: parsedParams,
          title: polishTitle,
          content: polishContent,
          direction: polishDirection,
          inspiration: inspirations[selectedInspiration],
          apiKey: apiConfig.apiKey,
          endpoint: apiConfig.endpoint,
          model: apiConfig.model,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setPolishedResult(data.result as PolishedResult)

      setTimeout(() => {
        polishResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 100)
    } catch (err) {
      setPolishError(
        err instanceof Error ? err.message : "润色生成失败，请重试"
      )
    } finally {
      setIsGeneratingPolish(false)
    }
  }

  /* ─── Handlers: Copy to Clipboard ─── */
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  /* ─── Render Helpers ─── */
  const paramCount = parsedParams ? Object.keys(parsedParams).length : 0

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero Header ─── */}
      <header className="hero-gradient relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 md:py-14">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                AI 智能校核工具
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-primary-foreground md:text-3xl">
                小红书电视文案参数校核助手
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/80 md:text-base">
                上传产品参数 → 粘贴文案 → AI 自动校核参数错误
              </p>
            </div>
            <button
              onClick={() => setShowApiConfig((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/25"
              title="API 设置"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 -mt-6 pb-16 space-y-6">
        {/* ─── Top-Level Tab Bar ─── */}
        <div className="flex justify-center">
          <div className="inline-flex gap-1 rounded-2xl bg-card/80 p-1.5 shadow-card backdrop-blur-sm border">
            <button
              onClick={() => setActiveMainTab("verify")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                activeMainTab === "verify"
                  ? "hero-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              参数校核
            </button>
            <button
              onClick={() => setActiveMainTab("polish")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                activeMainTab === "polish"
                  ? "hero-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Wand2 className="h-4 w-4" />
              文案润色
            </button>
          </div>
        </div>

        {/* ─── API Config Panel (shared) ─── */}
        {showApiConfig && (
          <Card className="animate-fade-in border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="section-step bg-primary/10 text-primary">
                    <Settings className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle>API 配置</CardTitle>
                </div>
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription>
                配置大模型 API 以启用参数解析和校核功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    API 提供商
                  </label>
                  <select
                    value={
                      Object.keys(API_PROVIDERS).find(
                        (k) =>
                          API_PROVIDERS[k as ProviderKey].endpoint ===
                          apiConfig.endpoint
                      ) || "deepseek"
                    }
                    onChange={(e) => {
                      const provider = e.target.value as ProviderKey
                      saveConfig({
                        ...apiConfig,
                        endpoint: API_PROVIDERS[provider].endpoint,
                        model: API_PROVIDERS[provider].model,
                      })
                    }}
                    className="input-base"
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                {apiConfig.endpoint === API_PROVIDERS.deepseek.endpoint && (
                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      DeepSeek 模型
                    </label>
                    <select
                      value={
                        Object.keys(DEEPSEEK_MODELS).find(
                          (k) =>
                            DEEPSEEK_MODELS[k as DeepseekModelKey].model ===
                            apiConfig.model
                        ) || "chat"
                      }
                      onChange={(e) => {
                        const modelKey = e.target.value as DeepseekModelKey
                        saveConfig({
                          ...apiConfig,
                          model: DEEPSEEK_MODELS[modelKey].model,
                        })
                      }}
                      className="input-base"
                    >
                      <option value="chat">
                        {DEEPSEEK_MODELS.chat.name} -{" "}
                        {DEEPSEEK_MODELS.chat.description}
                      </option>
                      <option value="reasoner">
                        {DEEPSEEK_MODELS.reasoner.name} -{" "}
                        {DEEPSEEK_MODELS.reasoner.description}
                      </option>
                    </select>
                  </div>
                )}
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiConfig.apiKey}
                      onChange={(e) =>
                        saveConfig({ ...apiConfig, apiKey: e.target.value })
                      }
                      placeholder="sk-..."
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={apiConfig.endpoint}
                    onChange={(e) =>
                      saveConfig({ ...apiConfig, endpoint: e.target.value })
                    }
                    placeholder={API_PROVIDERS.deepseek.endpoint}
                    className="input-base"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={apiConfig.model}
                    onChange={(e) =>
                      saveConfig({ ...apiConfig, model: e.target.value })
                    }
                    placeholder={API_PROVIDERS.deepseek.model}
                    className="input-base"
                  />
                </div>
              </div>
              {apiConfig.apiKey && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  API Key 已配置
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════
            ─── VERIFY TAB CONTENT ───
        ═══════════════════════════════════════════════════════ */}
        <div className={activeMainTab === "verify" ? "" : "hidden"}>
          {/* ─── Step 1: Parameter Input ─── */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="section-step hero-gradient text-primary-foreground">
                  1
                </div>
                <div>
                  <CardTitle>产品标准参数录入（可选）</CardTitle>
                  <CardDescription className="mt-0.5">
                    粘贴产品参数文本或上传 Excel 文件，不上传则仅进行文案润色
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                    activeTab === "text"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  文本粘贴
                </button>
                <button
                  onClick={() => setActiveTab("excel")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                    activeTab === "excel"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel 上传
                </button>
              </div>

              {activeTab === "text" && (
                <div className="animate-fade-in space-y-3">
                  <textarea
                    value={paramText}
                    onChange={(e) => {
                      setParamText(e.target.value)
                      setParseError("")
                    }}
                    placeholder={`请粘贴产品参数说明，例如：\n\n画质：4K 超高清\n画质芯片：MT9618\n屏幕：VA软屏\n刷新率：120Hz\n背光分区：无\n峰值亮度：350nit\n色域：72% NTSC\n音响品牌：自研\n声道：2.0声道 双扬声器\n运行内存：2GB\nHDMI数量：3个`}
                    rows={8}
                    className="input-base min-h-[160px] resize-y font-mono text-sm leading-relaxed"
                  />
                  <Button
                    onClick={handleParseParams}
                    disabled={isParsing || !paramText.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        正在解析参数…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        解析参数
                      </>
                    )}
                  </Button>
                </div>
              )}

              {activeTab === "excel" && (
                <div className="animate-fade-in space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input bg-muted/30 px-6 py-10 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        点击上传 Excel 文件
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        仅支持 .xlsx，两列格式（参数名 | 参数值）
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </div>
              )}

              {parseError && (
                <div className="animate-fade-in flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {parsedParams && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">
                      已识别标准参数（{paramCount} 项）
                    </span>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    {Object.entries(PARAM_CATEGORIES).map(
                      ([category, paramNames]) => {
                        const matchedParams = paramNames.filter(
                          (p) => parsedParams[p]
                        )
                        if (matchedParams.length === 0) return null
                        return (
                          <div key={category} className="mb-3 last:mb-0">
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {category}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {matchedParams.map((p) => (
                                <span
                                  key={p}
                                  className={cn(
                                    "param-tag",
                                    CATEGORY_STYLE[category]
                                  )}
                                >
                                  <span className="opacity-70">{p}</span>
                                  <span className="mx-1 opacity-30">|</span>
                                  <span className="font-semibold">
                                    {parsedParams[p]}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Step 2: Copy Input ─── */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="section-step hero-gradient text-primary-foreground">
                  2
                </div>
                <div>
                  <CardTitle>小红书文案</CardTitle>
                  <CardDescription className="mt-0.5">
                    粘贴需要校核或润色的小红书标题和正文
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  小红书标题
                </label>
                <input
                  type="text"
                  value={copyTitle}
                  onChange={(e) => {
                    setCopyTitle(e.target.value)
                    setVerifyError("")
                  }}
                  placeholder="请输入小红书标题"
                  className="input-base"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  小红书正文
                </label>
                <textarea
                  value={copyContent}
                  onChange={(e) => {
                    setCopyContent(e.target.value)
                    setVerifyError("")
                  }}
                  placeholder="请输入小红书正文内容"
                  rows={6}
                  className="input-base min-h-[120px] resize-y leading-relaxed"
                />
              </div>

              {verifyError && (
                <div className="animate-fade-in flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {verifyError}
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={isVerifying}
                size="lg"
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {parsedParams ? "正在校核参数…" : "正在润色文案…"}
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    {parsedParams ? "开始校核" : "开始润色"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ─── Step 3: Verify Results ─── */}
          {result && (
            <div ref={resultRef} className="animate-fade-in">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="section-step hero-gradient text-primary-foreground">
                      3
                    </div>
                    <CardTitle>校核结果</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {result.has_error ? (
                    <div className="flex items-center gap-3 rounded-xl bg-destructive/8 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                        <X className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-semibold text-destructive">
                          文案中存在参数错误
                        </p>
                        <p className="mt-0.5 text-sm text-destructive/80">
                          共发现 {result.error_list.length} 处参数错误，请查看下方详情
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl bg-success/8 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-success">
                          文案中所有参数均正确
                        </p>
                        <p className="mt-0.5 text-sm text-success/80">
                          文案中出现的参数与标准参数一致
                        </p>
                      </div>
                    </div>
                  )}

                  {result.has_error && result.error_list.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        错误明细
                      </h4>
                      <div className="overflow-hidden rounded-xl border">
                        <div className="grid grid-cols-4 gap-2 bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                          <span>位置</span>
                          <span>参数项</span>
                          <span>文案内容</span>
                          <span>正确参数</span>
                        </div>
                        {result.error_list.map((err, i) => (
                          <div
                            key={i}
                            className={cn(
                              "grid grid-cols-4 gap-2 px-4 py-3 text-sm animate-slide-in",
                              i % 2 === 1 && "bg-muted/20"
                            )}
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            <span className="font-medium">{err.position}</span>
                            <span
                              className={cn(
                                "param-tag w-fit",
                                CATEGORY_STYLE[getCategoryForParam(err.param)]
                              )}
                            >
                              {err.param}
                            </span>
                            <span className="text-destructive line-through decoration-destructive/40">
                              {err.wrong_value}
                            </span>
                            <span className="font-semibold text-success">
                              {err.correct_value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.corrected_title && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          修正后标题
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(result.corrected_title, "title")
                          }
                          className="h-8 gap-1.5 text-xs"
                        >
                          {copiedField === "title" ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-success" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              复制标题
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm leading-relaxed">
                        {result.corrected_title}
                      </div>
                    </div>
                  )}

                  {result.corrected_content && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          修正后正文
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(result.corrected_content, "content")
                          }
                          className="h-8 gap-1.5 text-xs"
                        >
                          {copiedField === "content" ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-success" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              复制正文
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                        {result.corrected_content}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            ─── POLISH TAB CONTENT ───
        ═══════════════════════════════════════════════════════ */}
        <div className={activeMainTab === "polish" ? "" : "hidden"}>
          {/* ─── Parameter Status ─── */}
          {!parsedParams && (
            <Card className="mb-6 border-amber-500/30 bg-amber-50/50">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    请先上传产品参数
                  </p>
                  <p className="text-xs text-amber-600">
                    润色功能需要复用【参数校核】模块的产品参数，以确保文案参数准确
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveMainTab("verify")}
                  className="shrink-0"
                >
                  前往上传
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {parsedParams && (
            <Card className="mb-6 border-success/30 bg-success/5">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">
                    已加载 {paramCount} 项产品参数
                  </p>
                  <p className="text-xs text-success/70">
                    润色文案将严格使用这些参数，不会修改或虚构
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Step 1: Polish Input ─── */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="section-step hero-gradient text-primary-foreground">
                  1
                </div>
                <div>
                  <CardTitle>待润色文案</CardTitle>
                  <CardDescription className="mt-0.5">
                    输入原始文案并选择润色方向
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  小红书标题
                </label>
                <input
                  type="text"
                  value={polishTitle}
                  onChange={(e) => setPolishTitle(e.target.value)}
                  placeholder="请输入原始标题"
                  className="input-base"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  小红书正文
                </label>
                <textarea
                  value={polishContent}
                  onChange={(e) => setPolishContent(e.target.value)}
                  placeholder="请输入原始正文内容"
                  rows={5}
                  className="input-base min-h-[100px] resize-y leading-relaxed"
                />
              </div>

              {/* Direction Selector */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  选择润色方向
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POLISH_DIRECTIONS.map((dir) => (
                    <button
                      key={dir.key}
                      onClick={() => {
                        setPolishDirection(dir.key)
                        setInspireError("")
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        polishDirection === dir.key
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <p className="text-sm font-medium">{dir.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {dir.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {inspireError && (
                <div className="animate-fade-in flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {inspireError}
                </div>
              )}

              <Button
                onClick={handleGenerateInspirations}
                disabled={isGeneratingInspirations}
                size="lg"
                className="w-full"
              >
                {isGeneratingInspirations ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在发散灵感…
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    发散灵感
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ─── Step 2: Inspirations ─── */}
          {inspirations.length > 0 && (
            <Card className="mb-6 animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="section-step hero-gradient text-primary-foreground">
                      2
                    </div>
                    <div>
                      <CardTitle>选择灵感方向</CardTitle>
                      <CardDescription className="mt-0.5">
                        选择一条最满意的创作灵感
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateInspirations}
                    disabled={isGeneratingInspirations}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isGeneratingInspirations && "animate-spin"
                      )}
                    />
                    重新生成
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {inspirations.map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedInspiration(idx)
                      setPolishError("")
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all animate-slide-in",
                      selectedInspiration === idx
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/30 hover:bg-muted/20"
                    )}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        selectedInspiration === idx
                          ? "border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedInspiration === idx && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          灵感 {idx + 1}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{text}</p>
                    </div>
                  </button>
                ))}

                {polishError && (
                  <div className="animate-fade-in flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {polishError}
                  </div>
                )}

                <Button
                  onClick={handleGeneratePolish}
                  disabled={
                    isGeneratingPolish || selectedInspiration === null
                  }
                  size="lg"
                  className="w-full mt-4"
                >
                  {isGeneratingPolish ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在润色生成…
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      生成润色文案
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ─── Step 3: Polished Result ─── */}
          {polishedResult && (
            <div ref={polishResultRef} className="animate-fade-in">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="section-step hero-gradient text-primary-foreground">
                      3
                    </div>
                    <CardTitle>润色结果</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Polished Titles */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      润色后标题
                    </h4>
                    {polishedResult.polished_titles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3"
                      >
                        <p className="text-sm leading-relaxed flex-1">
                          {title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(title, `polish-title-${idx}`)
                          }
                          className="h-8 shrink-0 gap-1.5 text-xs"
                        >
                          {copiedField === `polish-title-${idx}` ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-success" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              复制
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Polished Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">
                        润色后正文
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            polishedResult.polished_content,
                            "polish-content"
                          )
                        }
                        className="h-8 gap-1.5 text-xs"
                      >
                        {copiedField === "polish-content" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            复制正文
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {polishedResult.polished_content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          <p>
            小红书电视文案参数校核助手 · AI 驱动 · 仅校核参数，不改文案风格
          </p>
        </div>
      </footer>
    </div>
  )
}
