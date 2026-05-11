"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}

export function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  const handleToggle = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  return { isDark, handleToggle, mounted };
}

interface FormMessageState {
  message: string;
  isError: boolean;
}

export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [enabled, onEscape]);
}

export function useFormMessage(autoDismissMs: number = 5000) {
  const [state, setState] = useState<FormMessageState>({
    message: "",
    isError: false,
  });

  const clear = useCallback(() => {
    setState({ message: "", isError: false });
  }, []);

  const setSuccess = useCallback((message: string) => {
    setState({ message, isError: false });
  }, []);

  const setError = useCallback((message: string) => {
    setState({ message, isError: true });
  }, []);

  useEffect(() => {
    if (!state.message) return;
    const id = setTimeout(clear, autoDismissMs);
    return () => clearTimeout(id);
  }, [state.message, autoDismissMs, clear]);

  return { ...state, setSuccess, setError, clear };
}
