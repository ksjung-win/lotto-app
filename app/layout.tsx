import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "로또 당첨 번호 조회 앱",
  description: "역대 로또 당첨 번호 실시간 조회 및 모바일 앱 서비스",
  manifest: "/manifest.json", // 💡 PWA 앱 매니페스트 연결
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "로또앱",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 모바일에서 화면 확대/축소를 막고 진짜 앱처럼 보이게 하는 뷰포트 설정 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}