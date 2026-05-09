"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { dbotTokenFormSchema, type DbotTokenForm, type DbotTokenDisplay } from "@/lib/schemas"
import { useFormMessage } from "@/lib/hooks"
import { KeyRound, Save, Loader2, Eye, EyeOff, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { decodeJwtExp } from "@/lib/jwt"

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(dbotTokenFormSchema),
  })

  const tokenInput = watch("token")
  const inputExpiry = useMemo(() => {
    if (!tokenInput || typeof tokenInput !== "string") return null
    return decodeJwtExp(tokenInput)
  }, [tokenInput])

  const accessToken = session?.accessToken

  const { data: currentToken, mutate } = useSWR<DbotTokenDisplay>(
    accessToken ? ["/api/v1/admin/dbot-token", accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token),
    { revalidateOnFocus: false }
  )

  const currentExpiry = useMemo(() => {
    if (!currentToken?.token || typeof currentToken.token !== "string") return null
    return decodeJwtExp(currentToken.token)
  }, [currentToken])

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  if (!accessToken) {
    return null
  }

  const onSubmit = async (data: DbotTokenForm) => {
    clear()

    try {
      await apiFetch("/api/v1/admin/dbot-token", accessToken, {
        method: "PATCH",
        body: JSON.stringify({ token: data.token }),
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
          <div className="space-y-3 text-sm">
            {currentToken.token && (
              <>
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {showToken ? "Token" : "Token (ẩn)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowToken((prev) => !prev)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background cursor-pointer"
                      aria-pressed={showToken}
                      aria-label={showToken ? "Ẩn token" : "Hiện token"}
                    >
                      {showToken ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Ẩn
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Hiện
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-foreground">
                    {showToken
                      ? currentToken.token
                      : currentToken.token.slice(0, 20) + "…"}
                  </div>
                </div>

                {currentExpiry && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Hết hạn: {currentExpiry.toLocaleString("vi-VN")}
                    </span>
                  </div>
                )}
              </>
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
              rows={4}
              autoComplete="off"
              spellCheck={false}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="eyJhbGciOiJIUzI1NiIs…"
            />
            {errors.token && (
              <p className="mt-1 text-sm text-destructive">{errors.token.message}</p>
            )}
            {inputExpiry && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Token hết hạn: {inputExpiry.toLocaleString("vi-VN")}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
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
