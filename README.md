# 小红书电视文案参数校核助手

AI 驱动的小红书电视文案工具，集成参数校核、文案润色和风格迁移三大功能。

## 功能特性

### 1. 参数校核
- 上传电视产品标准参数（文本粘贴或 Excel 导入）
- AI 自动识别 16 项电视参数（画质、音质、智能、其他 4 大分类）
- 对比小红书文案中的参数准确性
- 输出错误清单和修正后文案，仅改参数不动风格

### 2. 文案润色（结构化重构）
- 8 种润色方向：使用反馈、询问互动、购物晒单、福利活动、安全下车、售后保障、噱头吸睛、热点结合
- 每种方向有固定的结构化写作模板和示例
- 两步交互：先发散 3-5 条灵感 → 选择灵感后生成重构文案
- 强制参数融入使用体验，禁止生硬罗列
- 结尾必须包含 1-3 条实用建议

### 3. 文案风格迁移
- 输入原始文案 + 参考文案（目标风格）
- 自定义修改方向说明
- AI 分析参考文案风格特征，将原始文案迁移到目标风格
- 保持核心信息和参数准确性

## 技术架构

```
┌────────────────────────────────────────────┐
│              前端 (React 18)               │
│  ┌──────────┬──────────┬──────────┐        │
│  │ 参数校核 │ 文案润色 │ 风格迁移 │        │
│  └──────────┴──────────┴──────────┘        │
│         共享 API 配置 & 参数状态            │
└───────────────┬────────────────────────────┘
                │ fetch
┌───────────────▼────────────────────────────┐
│         Next.js API Routes                 │
│  /api/parse     参数解析                    │
│  /api/verify    参数校核                    │
│  /api/inspire   灵感发散                    │
│  /api/polish    文案润色                    │
│  /api/style-transfer  风格迁移             │
└───────────────┬────────────────────────────┘
                │ 代理转发
┌───────────────▼────────────────────────────┐
│         外部 AI 服务                       │
│  DeepSeek / OpenAI / 通义千问 / 文心一言   │
│  讯飞星火 / 腾讯混元 / 豆包 / 自定义      │
└────────────────────────────────────────────┘
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 前端 | React 18, TypeScript 5.x |
| 样式 | Tailwind CSS 3.4, CSS Variables |
| AI | OpenAI 兼容 API (多厂商支持) |
| 工具 | xlsx (Excel 解析), lucide-react (图标) |

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

### Windows 一键启动
双击 `启动程序.bat`

### macOS 一键启动
```bash
chmod +x start.command
# 然后双击 start.command
```

## 支持的 AI 提供商

| 提供商 | Endpoint | 默认模型 |
|--------|----------|---------|
| DeepSeek | api.deepseek.com | deepseek-chat |
| OpenAI | api.openai.com | gpt-4o-mini |
| 通义千问 | dashscope.aliyuncs.com | qwen-plus |
| 文心一言 | aip.baidubce.com | ernie-4.0 |
| 讯飞星火 | spark-api-open.xf-yun.com | generalv3.5 |
| 腾讯混元 | hunyuan.tencentcloudapi.com | hunyuan-pro |
| 豆包 | ark.cn-beijing.volces.com | doubao-pro-32k |

所有提供商均通过 OpenAI 兼容接口调用，用户也可自定义 Endpoint 和模型名称。

## 项目结构

```
├── app/
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 主页（参数校核 + 文案润色）
│   ├── style-transfer/
│   │   └── page.tsx          # 风格迁移页面
│   ├── api/
│   │   ├── parse/route.ts    # 参数解析 API
│   │   ├── verify/route.ts   # 参数校核 API
│   │   ├── inspire/route.ts  # 灵感发散 API
│   │   ├── polish/route.ts   # 文案润色 API
│   │   └── style-transfer/route.ts  # 风格迁移 API
│   └── globals.css           # 全局样式 & 设计令牌
├── components/ui/            # UI 组件
├── lib/
│   ├── constants.ts          # 常量、Prompt 模板、结构化模板
│   └── utils.ts              # 工具函数
├── 启动程序.bat               # Windows 启动脚本
└── start.command             # macOS 启动脚本
```

## 设计特色

- 珊瑚红渐变主题，贴合小红书品牌调性
- 响应式布局，支持移动端
- 参数分类标签（画质/音质/智能/其他）颜色区分
- 流畅动画过渡
- localStorage 持久化 API 配置

## 安全说明

- API Key 仅存储在用户浏览器 localStorage 中
- 通过 Next.js API Routes 代理转发 AI 请求，避免前端直接暴露密钥
- 不收集、不上传用户数据
