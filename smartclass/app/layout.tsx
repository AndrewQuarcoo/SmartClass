import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { RootClientLayout } from "./ClientLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SmartClass - Offline Learning Companion",
  description: "An educational platform for offline learning",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <RootClientLayout>{children}</RootClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
