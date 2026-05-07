"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { SignalsDashboard } from "@/features/signals/signals-dashboard"
import { Shield, Moon, Sun } from "lucide-react"
import { toggleTheme } from "@/components/theme-provider"
import { useState, useEffect } from "react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const handleToggle = () => {
    toggleTheme()
    setIsDark((prev) => !prev)
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  if (status === "unauthenticated" || !session?.accessToken) {
    return null
  }

  const isAdmin = session.user?.is_admin === true

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-card-foreground">DBOT Signals Tracker</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin/token"
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
            <button
              onClick={handleToggle}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <SignalsDashboard />
      </main>
    </div>
  )
}
