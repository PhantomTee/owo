import type { Metadata } from "next"
import { DM_Sans, Fraunces } from "next/font/google"
import { ErrorBoundary } from "@/components/error-boundary"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans"
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces"
})

export const metadata: Metadata = {
  title: "Owo - Salary streaming on Arc",
  description: "Your money, the moment you earn it."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
