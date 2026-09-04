import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "没什么用商店",
  description: "卖一点没什么用，但可能今天正好需要的东西。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
