import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "小红书电视文案参数校核助手",
  description:
    "上传电视标准参数，粘贴小红书文案，AI 自动校核文案中出现的参数是否正确，输出错误清单和修正文案。",
  keywords: "小红书,电视文案,参数校核,AI工具,文案检查",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
