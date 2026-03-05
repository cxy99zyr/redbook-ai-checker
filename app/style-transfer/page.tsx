"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
  API_PROVIDERS,
  API_CONFIG_KEY,
  getModelsForEndpoint,
  type ApiConfig,
  type ProviderKey,
} from "@/lib/api-providers"
import {
  Settings,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Shuffle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
} from "lucide-react"

/* ─── Types ─── */
interface StyleTransferResult {
  style_analysis: string
  transferred_titles: string[]
  transferred_content: string
}

/* ─── Main Component ─── */
export default function StyleTransferPage() {
  /* ─── API Config ─── */
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiKey: "",
    endpoint: API_PROVIDERS.deepseek.endpoint,
    model: API_PROVIDERS.deepseek.model,
  })
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  /* ─── Input State ─── */
  const [originalTitle, setOriginalTitle] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [refTitle, setRefTitle] = useState("")
  const [refContent, setRefContent] = useState("")
  const [userDirection, setUserDirection] = useState("")

  /* ─── Result State ─── */
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferResult, setTransferResult] =
    useState<StyleTransferResult | null>(null)
  const [transferError, setTransferError] = useState("")

  /* ─── Copy feedback ─── */
  const [copiedField, setCopiedField] = useState<string | null>(null)

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

  /* ─── Handle Transfer ─── */
  const handleTransfer = async () => {
    if (!apiConfig.apiKey) {
      setShowApiConfig(true)
      setTransferError("请先配置 API Key")
      return
    }
    if (!originalContent.trim()) {
      setTransferError("请输入原始文案正文")
      return
    }
    if (!refContent.trim()) {
      setTransferError("请输入参考文案正文")
      return
    }

    setIsTransferring(true)
    setTransferError("")
    setTransferResult(null)

    try {
      const res = await fetch("/api/style-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTitle,
          originalContent,
          refTitle,
          refContent,
          userDirection,
          apiKey: apiConfig.apiKey,
          endpoint: apiConfig.endpoint,
          model: apiConfig.model,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setTransferResult(data.result as StyleTransferResult)
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : "风格迁移失败，请重试"
      )
    } finally {
      setIsTransferring(false)
    }
  }

  /* ─── Copy to Clipboard ─── */
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

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero Header ─── */}
      <header className="hero-gradient relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 md:py-14">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                <Shuffle className="h-3.5 w-3.5" />
                AI 风格迁移
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-primary-foreground md:text-3xl">
                文案风格迁移
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/80 md:text-base">
                提供参考文案 → 分析风格特征 → AI 自动迁移生成新文案
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-sm font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Link>
              <button
                onClick={() => setShowApiConfig((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/25"
                title="API 设置"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 -mt-6 pb-16 space-y-6">
        {/* ─── API Config Panel ─── */}
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
                配置大模型 API 以启用风格迁移功能（与主页共享配置）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    {Object.entries(API_PROVIDERS).map(([key, provider]) => (
                      <option key={key} value={key}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    模型选择
                  </label>
                  <select
                    value={
                      getModelsForEndpoint(apiConfig.endpoint).some(
                        (m) => m.id === apiConfig.model
                      )
                        ? apiConfig.model
                        : "__custom__"
                    }
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        saveConfig({ ...apiConfig, model: "" })
                        return
                      }
                      saveConfig({ ...apiConfig, model: e.target.value })
                    }}
                    className="input-base"
                  >
                    {getModelsForEndpoint(apiConfig.endpoint).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.description ? ` - ${m.description}` : ""}
                      </option>
                    ))}
                    <option value="__custom__">自定义模型...</option>
                  </select>
                  {!getModelsForEndpoint(apiConfig.endpoint).some(
                    (m) => m.id === apiConfig.model
                  ) && (
                    <input
                      type="text"
                      value={apiConfig.model}
                      onChange={(e) =>
                        saveConfig({ ...apiConfig, model: e.target.value })
                      }
                      placeholder="请输入自定义模型名称，如 gpt-4o"
                      className="input-base mt-2"
                      autoFocus
                    />
                  )}
                </div>
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
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={apiConfig.endpoint}
                    onChange={(e) =>
                      saveConfig({ ...apiConfig, endpoint: e.target.value })
                    }
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

        {/* ─── Step 1: Original Copy ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="section-step hero-gradient text-primary-foreground">
                1
              </div>
              <div>
                <CardTitle>原始文案</CardTitle>
                <CardDescription className="mt-0.5">
                  输入需要进行风格迁移的原始文案
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                原始标题
              </label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => {
                  setOriginalTitle(e.target.value)
                  setTransferError("")
                }}
                placeholder="请输入原始文案标题"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                原始正文
              </label>
              <textarea
                value={originalContent}
                onChange={(e) => {
                  setOriginalContent(e.target.value)
                  setTransferError("")
                }}
                placeholder="请输入需要风格迁移的原始文案正文"
                rows={5}
                className="input-base min-h-[100px] resize-y leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Step 2: Reference Copy ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="section-step hero-gradient text-primary-foreground">
                2
              </div>
              <div>
                <CardTitle>参考文案（目标风格）</CardTitle>
                <CardDescription className="mt-0.5">
                  输入你想要模仿的文案风格示例
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                参考标题
              </label>
              <input
                type="text"
                value={refTitle}
                onChange={(e) => {
                  setRefTitle(e.target.value)
                  setTransferError("")
                }}
                placeholder="请输入参考文案标题（可选）"
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                参考正文
              </label>
              <textarea
                value={refContent}
                onChange={(e) => {
                  setRefContent(e.target.value)
                  setTransferError("")
                }}
                placeholder="请输入目标风格的参考文案正文"
                rows={5}
                className="input-base min-h-[100px] resize-y leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Step 3: Direction + Execute ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="section-step hero-gradient text-primary-foreground">
                3
              </div>
              <div>
                <CardTitle>修改方向（可选）</CardTitle>
                <CardDescription className="mt-0.5">
                  指定额外的修改要求，如强调某个卖点、调整语气等
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={userDirection}
              onChange={(e) => setUserDirection(e.target.value)}
              placeholder="例如：保留原文的促销信息，但语气更活泼一些；或者：强调4K画质和120Hz刷新率的体验"
              rows={3}
              className="input-base min-h-[80px] resize-y leading-relaxed"
            />

            {transferError && (
              <div className="animate-fade-in flex items-start gap-2 rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {transferError}
              </div>
            )}

            <Button
              onClick={handleTransfer}
              disabled={isTransferring}
              size="lg"
              className="w-full"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在分析风格并迁移…
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  开始风格迁移
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Step 4: Results ─── */}
        {transferResult && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="section-step hero-gradient text-primary-foreground">
                  4
                </div>
                <CardTitle>迁移结果</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Style Analysis */}
              {transferResult.style_analysis && (
                <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">
                      风格分析
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {transferResult.style_analysis}
                    </p>
                  </div>
                </div>
              )}

              {/* Transferred Titles */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  迁移后标题
                </h4>
                {transferResult.transferred_titles.map((title, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3"
                  >
                    <p className="text-sm leading-relaxed flex-1">{title}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(title, `transfer-title-${idx}`)
                      }
                      className="h-8 shrink-0 gap-1.5 text-xs"
                    >
                      {copiedField === `transfer-title-${idx}` ? (
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

              {/* Transferred Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    迁移后正文
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        transferResult.transferred_content,
                        "transfer-content"
                      )
                    }
                    className="h-8 gap-1.5 text-xs"
                  >
                    {copiedField === "transfer-content" ? (
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
                  {transferResult.transferred_content}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          <p>
            小红书电视文案参数校核助手 · AI 驱动 · 风格迁移功能
          </p>
        </div>
      </footer>
    </div>
  )
}
