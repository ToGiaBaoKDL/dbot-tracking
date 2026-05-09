"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { dbotTokenFormSchema, type DbotTokenForm, type DbotTokenDisplay } from "@/lib/schemas"
import { useFormMessage } from "@/lib/hooks"
import { KeyRound, Save, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function TokenPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { message, isError, setSuccess, setError, clear } = useFormMessage()
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(dbotTokenFormSchema),
  })

  const { data: currentToken, mutate } = useSWR<DbotTokenDisplay>(
    session?.accessToken ? ["/api/v1/admin/dbot-token", session.accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token),
    { revalidateOnFocus: false }
  )

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  if (!session?.accessToken) {
    return null
  }

  const onSubmit = async (data: DbotTokenForm) => {
    clear()

    try {
      const body: Record<string, string> = { token: data.token }
      if (data.expires_at) {
        body.expires_at = data.expires_at
      }

      await apiFetch("/api/v1/admin/dbot-token", session.accessToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      setSuccess("Cập nhật token thành công")
      reset()
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại")
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Quản lý DBOT Token"
        description="Cập nhật Bearer token để ETL có thể crawl dữ liệu"
      />

      {/* Current Token */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <KeyRound className="h-5 w-5 text-primary" />
          Token hiện tại
        </h2>
        {currentToken === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : currentToken ? (
          <div className="space-y-2 text-sm">
            {currentToken.token && (
              <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                <div className="flex-1 break-all font-mono text-xs text-muted-foreground">
                  {showToken ? currentToken.token : currentToken.token.slice(0, 20) + "…"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background"
                  aria-pressed={showToken}
                  aria-label={showToken ? "Ẩn token" : "Hiện token"}
                >
                  {showToken ? "Ẩn" : "Hiện"}
                </button>
              </div>
            )}
            {currentToken.expires_at && (
              <p className="text-muted-foreground">Hết hạn: {currentToken.expires_at}</p>
            )}
            {currentToken.updated_at && (
              <p className="text-muted-foreground">
                Cập nhật: {(() => {
                  try {
                    const d = new Date(currentToken.updated_at)
                    return Number.isNaN(d.getTime()) ? currentToken.updated_at : d.toLocaleString("vi-VN")
                  } catch {
                    return currentToken.updated_at
                  }
                })()}
              </p>
            )}
            {currentToken.message && (
              <p className="text-muted-foreground">{currentToken.message}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Chưa có token nào được cấu hình</p>
        )}
      </div>

      {/* Update Form */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Cập nhật token</h2>

        {message && (
          <Alert variant={isError ? "destructive" : "success"} className="mb-4">
            {message}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="token-input" className="block text-sm font-medium text-card-foreground">
              Token xác thực <span className="text-destructive">*</span>
            </label>
            <textarea
              id="token-input"
              {...register("token")}
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="eyJhbGciOiJIUzI1NiIs…"
            />
            {errors.token && (
              <p className="mt-1 text-sm text-destructive">{errors.token.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="expires-input" className="block text-sm font-medium text-card-foreground">
              Ngày hết hạn (tùy chọn)
            </label>
            <Input
              id="expires-input"
              type="date"
              {...register("expires_at")}
              className="mt-1 w-auto"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </form>
      </div>
    </div>
  )
}
