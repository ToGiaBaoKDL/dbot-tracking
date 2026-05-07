"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { KeyRound, Save, Loader2 } from "lucide-react"

const tokenSchema = z.object({
  token: z.string().min(10, "Token tối thiểu 10 ký tự"),
  expires_at: z.string().optional(),
})

type TokenForm = z.infer<typeof tokenSchema>

interface DbotTokenDisplay {
  id?: number
  token?: string
  expires_at?: string
  updated_at?: string
  message?: string
}

export default function TokenPage() {
  const { data: session } = useSession()
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(tokenSchema),
  })

  const { data: currentToken, mutate } = useSWR<DbotTokenDisplay>(
    session?.accessToken ? ["/api/v1/admin/dbot-token", session.accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token),
    { revalidateOnFocus: false }
  )

  const onSubmit = async (data: TokenForm) => {
    setMessage("")
    setIsError(false)

    try {
      const body: Record<string, string> = { token: data.token }
      if (data.expires_at) {
        body.expires_at = data.expires_at
      }

      await apiFetch("/api/v1/admin/dbot-token", session!.accessToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      setMessage("Cập nhật token thành công")
      reset()
      mutate()
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : "Cập nhật thất bại")
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Quản lý DBOT Token</h1>
        <p className="mt-1 text-muted-foreground">Cập nhật Bearer token để ETL có thể crawl dữ liệu</p>
      </div>

      {/* Current Token */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <KeyRound className="h-5 w-5 text-primary" />
          Token hiện tại
        </h2>
        {currentToken ? (
          <div className="space-y-2 text-sm">
            {currentToken.token && (
              <div className="rounded bg-muted p-3 font-mono text-xs break-all text-muted-foreground">
                {currentToken.token}
              </div>
            )}
            {currentToken.expires_at && (
              <p className="text-muted-foreground">Hết hạn: {currentToken.expires_at}</p>
            )}
            {currentToken.updated_at && (
              <p className="text-muted-foreground">
                Cập nhật: {new Date(currentToken.updated_at).toLocaleString("vi-VN")}
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
          <div
            role="alert"
            className={`mb-4 rounded-md p-3 text-sm ${
              isError
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Bearer Token <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register("token")}
              rows={3}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
            />
            {errors.token && (
              <p className="mt-1 text-sm text-destructive">{errors.token.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Ngày hết hạn (tùy chọn)
            </label>
            <input
              type="date"
              {...register("expires_at")}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? "Đang lưu..." : "Cập nhật"}
          </button>
        </form>
      </div>
    </div>
  )
}
