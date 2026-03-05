/**
 * 共享的 API 提供商配置
 * 被主页和风格迁移页面共同使用
 */

export interface ApiConfig {
  apiKey: string
  endpoint: string
  model: string
}

export const API_CONFIG_KEY = "redbook-ai-config"

export interface ModelOption {
  id: string
  name: string
  description?: string
}

export interface ProviderConfig {
  name: string
  endpoint: string
  model: string
  models: ModelOption[]
}

export const API_PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "通用对话，适合大多数任务" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", description: "推理模型，适合复杂逻辑" },
    ],
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "快速经济" },
      { id: "gpt-4o", name: "GPT-4o", description: "最强多模态" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "高性能" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "经典快速" },
    ],
  },
  qwen: {
    name: "通义千问",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
    models: [
      { id: "qwen-plus", name: "Qwen Plus", description: "均衡性能" },
      { id: "qwen-turbo", name: "Qwen Turbo", description: "快速响应" },
      { id: "qwen-max", name: "Qwen Max", description: "最强性能" },
      { id: "qwen-long", name: "Qwen Long", description: "长文本处理" },
    ],
  },
  wenxin: {
    name: "文心一言",
    endpoint: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro",
    model: "ernie-4.0-8k",
    models: [
      { id: "ernie-4.0-8k", name: "ERNIE 4.0", description: "旗舰模型" },
      { id: "ernie-3.5-8k", name: "ERNIE 3.5", description: "均衡高效" },
      { id: "ernie-speed-128k", name: "ERNIE Speed", description: "极速响应" },
    ],
  },
  spark: {
    name: "讯飞星火",
    endpoint: "https://spark-api-open.xf-yun.com/v1/chat/completions",
    model: "generalv3.5",
    models: [
      { id: "generalv3.5", name: "Spark 3.5", description: "最新版本" },
      { id: "generalv3", name: "Spark 3.0", description: "稳定版本" },
      { id: "4.0Ultra", name: "Spark 4.0 Ultra", description: "旗舰模型" },
    ],
  },
  hunyuan: {
    name: "腾讯混元",
    endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
    model: "hunyuan-pro",
    models: [
      { id: "hunyuan-pro", name: "混元 Pro", description: "旗舰模型" },
      { id: "hunyuan-standard", name: "混元 Standard", description: "均衡高效" },
      { id: "hunyuan-lite", name: "混元 Lite", description: "轻量快速" },
    ],
  },
  doubao: {
    name: "豆包",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    model: "doubao-pro-32k",
    models: [
      { id: "doubao-pro-32k", name: "豆包 Pro 32K", description: "高性能长文本" },
      { id: "doubao-pro-128k", name: "豆包 Pro 128K", description: "超长上下文" },
      { id: "doubao-lite-32k", name: "豆包 Lite 32K", description: "轻量快速" },
    ],
  },
}

export type ProviderKey = keyof typeof API_PROVIDERS
export const DEFAULT_PROVIDER: ProviderKey = "deepseek"

/** 根据 endpoint 获取当前 provider 的可选模型列表 */
export function getModelsForEndpoint(endpoint: string): ModelOption[] {
  for (const provider of Object.values(API_PROVIDERS)) {
    if (provider.endpoint === endpoint) return provider.models
  }
  return []
}

/** 加载已保存的 API 配置 */
export function loadApiConfig(): ApiConfig {
  try {
    if (typeof window === "undefined") {
      return {
        apiKey: "",
        endpoint: API_PROVIDERS[DEFAULT_PROVIDER].endpoint,
        model: API_PROVIDERS[DEFAULT_PROVIDER].model,
      }
    }
    const saved = localStorage.getItem(API_CONFIG_KEY)
    if (saved) {
      return JSON.parse(saved) as ApiConfig
    }
  } catch {}
  return {
    apiKey: "",
    endpoint: API_PROVIDERS[DEFAULT_PROVIDER].endpoint,
    model: API_PROVIDERS[DEFAULT_PROVIDER].model,
  }
}

/** 保存 API 配置 */
export function saveApiConfig(config: ApiConfig): void {
  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
}

/** 根据 endpoint 反推 provider key */
export function getProviderKeyByEndpoint(endpoint: string): ProviderKey {
  for (const [key, provider] of Object.entries(API_PROVIDERS)) {
    if (provider.endpoint === endpoint) return key as ProviderKey
  }
  return "deepseek"
}
