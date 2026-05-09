"use client"

import { useState, useEffect, useCallback } from "react"
import { toggleTheme as _toggleTheme } from "@/components/theme-provider"

export function useThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const handleToggle = useCallback(() => {
    _toggleTheme()
    setIsDark((prev) => !prev)
  }, [])

  return { isDark, handleToggle }
}

interface FormMessageState {
  message: string
  isError: boolean
}

export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [enabled, onEscape])
}

export function useFormMessage() {
  const [state, setState] = useState<FormMessageState>({ message: "", isError: false })

  const setSuccess = useCallback((message: string) => {
    setState({ message, isError: false })
  }, [])

  const setError = useCallback((message: string) => {
    setState({ message, isError: true })
  }, [])

  const clear = useCallback(() => {
    setState({ message: "", isError: false })
  }, [])

  return { ...state, setSuccess, setError, clear }
}
