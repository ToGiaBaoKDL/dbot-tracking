"use client"

import { useEffect } from "react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    const stored = localStorage.getItem("theme")
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (stored === "dark" || (!stored && systemDark)) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [])

  return <>{children}</>
}

export function toggleTheme() {
  const root = document.documentElement
  const isDark = root.classList.toggle("dark")
  localStorage.setItem("theme", isDark ? "dark" : "light")
}
