"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[CLIENT] Page error:", error.message)
  }, [error])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-xl font-bold text-destructive">Đã xảy ra lỗi</h2>
        <p className="mt-2 text-muted-foreground">Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
