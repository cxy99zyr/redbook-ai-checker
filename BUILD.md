# 小红书电视文案参数校核助手 - 打包部署指南

## 一、打包方案概述

本项目支持两种部署方式：

| 方式 | 适用场景 | 依赖要求 | 文件大小 |
|------|---------|---------|---------|
| **方式一：可执行文件** | 分发给终端用户 | 无需安装任何环境 | ~100MB |
| **方式二：便携包** | 有 Node.js 环境的用户 | 需要 Node.js 18+ | ~50MB |

---

## 二、方式一：生成可执行文件（推荐）

### 2.1 环境准备

```bash
# 1. 安装依赖
npm install

# 2. 安装 pkg 打包工具（已在 devDependencies 中）
npm install -D pkg
```

### 2.2 打包命令

```bash
# 仅打包 Windows 版本
npm run pkg:win

# 仅打包 macOS 版本
npm run pkg:mac

# 仅打包 Linux 版本
npm run pkg:linux

# 同时打包三个平台
npm run pkg:all
```

### 2.3 输出文件

打包完成后，可执行文件位于 `dist/` 目录：

```
dist/
├── redbook-ai-win.exe      # Windows 可执行文件
├── redbook-ai-macos        # macOS 可执行文件
└── redbook-ai-linux        # Linux 可执行文件
```

### 2.4 运行可执行文件

**Windows:**
```bash
# 双击运行，或在命令行执行：
.\redbook-ai-win.exe
```

**macOS:**
```bash
# 添加执行权限
chmod +x redbook-ai-macos
# 运行
./redbook-ai-macos
```

**Linux:**
```bash
# 添加执行权限
chmod +x redbook-ai-linux
# 运行
./redbook-ai-linux
```

运行后会自动：
1. 启动本地 Web 服务器（默认端口 3000）
2. 自动打开浏览器访问应用
3. 在终端显示访问地址

---

## 三、方式二：便携包部署

适合有 Node.js 环境的用户，文件体积更小。

### 3.1 构建 standalone 版本

```bash
npm run build:standalone
```

### 3.2 复制部署文件

将以下文件/目录复制到目标机器：

```
.next/standalone/     # 必须
.next/static/         # 必须
public/               # 如果存在
server.js             # 启动脚本
```

### 3.3 运行应用

```bash
# 在目标机器上运行
node server.js
```

---

## 四、自定义配置

### 4.1 修改端口

```bash
# Windows
set PORT=8080 && redbook-ai-win.exe

# macOS/Linux
PORT=8080 ./redbook-ai-macos
```

### 4.2 修改监听地址

```bash
# 允许局域网访问
HOST=0.0.0.0 PORT=3000 ./redbook-ai-linux
```

---

## 五、分发注意事项

### 5.1 文件大小优化

可执行文件较大（~100MB）是因为包含了完整的 Node.js 运行时。如需减小体积：

1. 使用 UPX 压缩（可减小 30-50%）：
   ```bash
   # 安装 UPX
   # Windows: https://github.com/upx/upx/releases
   # macOS: brew install upx
   # Linux: apt install upx
   
   upx --best dist/redbook-ai-win.exe
   ```

2. 使用便携包方式分发（需要用户有 Node.js 环境）

### 5.2 安全提示

- 可执行文件首次运行时可能触发系统安全警告，这是正常现象
- Windows 用户可能需要点击"仍要运行"
- macOS 用户可能需要在"系统偏好设置 > 安全性与隐私"中允许运行

### 5.3 API 密钥说明

应用的 API 密钥（DeepSeek/OpenAI）由用户在界面中输入，存储在浏览器 localStorage 中：

- 不需要在打包时配置任何密钥
- 用户需要自行准备 API Key
- 数据仅存储在用户本地，不会上传到任何服务器

---

## 六、故障排除

### 6.1 端口被占用

如果 3000 端口被占用，程序会自动尝试 3001、3002 等端口。

### 6.2 Windows 防火墙

首次运行时，Windows 可能提示允许网络访问，请点击"允许"。

### 6.3 macOS "无法验证开发者"

```bash
# 移除隔离属性
xattr -d com.apple.quarantine redbook-ai-macos
```

### 6.4 构建失败

```bash
# 清理缓存后重新构建
rm -rf .next node_modules
npm install
npm run pkg:win
```

---

## 七、技术架构

```
┌─────────────────────────────────────────────┐
│           可执行文件 (redbook-ai.exe)        │
├─────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │   Node.js 18    │  │   server.js     │   │
│  │   Runtime       │  │   启动脚本       │   │
│  └─────────────────┘  └─────────────────┘   │
│  ┌─────────────────────────────────────┐    │
│  │        .next/standalone             │    │
│  │   (Next.js 生产构建产物)             │    │
│  │   - 服务端渲染代码                   │    │
│  │   - API Routes (/api/*)             │    │
│  │   - 静态资源                         │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
            │
            ▼ 启动后
┌─────────────────────────────────────────────┐
│  HTTP Server (localhost:3000)              │
│  ├── / (React 前端页面)                     │
│  ├── /api/parse (参数解析)                  │
│  ├── /api/verify (参数校核)                 │
│  ├── /api/inspire (灵感发散)                │
│  └── /api/polish (文案润色)                 │
└─────────────────────────────────────────────┘
```

---

## 八、版本信息

- 项目版本：0.1.0
- Node.js 目标版本：18.x
- Next.js 版本：14.2.35
- 支持平台：Windows (x64) / macOS (x64) / Linux (x64)
