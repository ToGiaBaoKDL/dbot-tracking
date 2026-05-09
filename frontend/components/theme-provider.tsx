"use client"

import { useEffect } from "react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const root = document.documentElement
      const stored = localStorage.getItem("theme")
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

      if (stored === "dark" || (!stored && systemDark)) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    } catch {
      // localStorage may be unavailable (e.g., private mode)
    }
  }, [])

  return <>{children}</>
}

export function toggleTheme() {
  const root = document.documentElement
  const isDark = root.classList.toggle("dark")
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light")
  } catch {
    // localStorage may be unavailable
  }
}
