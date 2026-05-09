"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { SignalsTable } from "./signals-table"
import { signalsDataSchema } from "@/lib/schemas"
import type { SignalsData, SignalType } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert } from "@/components/ui/alert"

const today = format(new Date(), "yyyy-MM-dd")

function getValidSignalType(value: string | null): SignalType {
  if (value === "BUY" || value === "SELL") return value
  return "ALL"
}

function getValidFutureDays(value: string | null): number {
  const n = Number(value)
  if (!Number.isNaN(n) && n >= 1 && n <= 14) return n
  return 7
}

export function SignalsDashboard() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Derive initial state from URL; local state for UI responsiveness
  const [date, setDate] = useState(searchParams.get("date") || today)
  const [futureDays, setFutureDays] = useState(getValidFutureDays(searchParams.get("future_days")))
  const [signalType, setSignalType] = useState<SignalType>(getValidSignalType(searchParams.get("signal_type")))
  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "")

  // Sync local state when URL changes (browser back/forward)
  useEffect(() => {
    setDate(searchParams.get("date") || today)
    setFutureDays(getValidFutureDays(searchParams.get("future_days")))
    setSignalType(getValidSignalType(searchParams.get("signal_type")))
    setSymbol(searchParams.get("symbol") || "")
  }, [searchParams])

  const maxDate = today

  const updateQuery = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  const handleDateChange = (value: string) => {
    setDate(value)
    updateQuery({ date: value })
  }

  const handleSignalTypeChange = (value: SignalType) => {
    setSignalType(value)
    updateQuery({ signal_type: value })
  }

  const handleSymbolChange = (value: string) => {
    setSymbol(value)
    updateQuery({ symbol: value.trim().toUpperCase() })
  }

  const handleFutureDaysChange = (value: number) => {
    setFutureDays(value)
    updateQuery({ future_days: String(value) })
  }

  const path = useMemo(() => {
    const params = new URLSearchParams()
    params.set("date", date)
    params.set("future_days", String(futureDays))
    params.set("signal_type", signalType)
    if (symbol.trim()) {
      params.set("symbol", symbol.trim().toUpperCase())
    }
    return `/api/v1/signals?${params.toString()}`
  }, [date, futureDays, signalType, symbol])

  const { data, error, isLoading, isValidating, mutate } = useSWR<SignalsData>(
    session?.accessToken ? [path, session.accessToken] : null,
    ([p, token]: [string, string]) => apiFetch(p, token, { schema: signalsDataSchema }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    }
  )

  const showBuy = signalType === "ALL" || signalType === "BUY"
  const showSell = signalType === "ALL" || signalType === "SELL"

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <label htmlFor="date-filter" className="block text-sm font-medium text-card-foreground">
            Ngày
          </label>
          <Input
            id="date-filter"
            type="date"
            value={date}
            max={maxDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="mt-1 w-auto"
          />
        </div>

        <div>
          <label htmlFor="signal-type" className="block text-sm font-medium text-card-foreground">
            Tín hiệu
          </label>
          <Select
            id="signal-type"
            value={signalType}
            onChange={(e) => handleSignalTypeChange(e.target.value as SignalType)}
            className="mt-1"
          >
            <option value="ALL">Tất cả</option>
            <option value="BUY">MUA</option>
            <option value="SELL">BÁN</option>
          </Select>
        </div>

        <div>
          <label htmlFor="symbol-filter" className="block text-sm font-medium text-card-foreground">
            Mã CK
          </label>
          <Input
            id="symbol-filter"
            type="text"
            value={symbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            placeholder="VD: VNM"
            maxLength={20}
            className="mt-1 w-32 uppercase placeholder:normal-case"
          />
        </div>

        <div>
          <label htmlFor="future-days" className="block text-sm font-medium text-card-foreground">
            Số ngày hiển thị (1-14)
          </label>
          <Slider
            id="future-days"
            min={1}
            max={14}
            value={futureDays}
            onChange={(e) => handleFutureDaysChange(Number(e.target.value))}
            aria-label="Số ngày hiển thị giá tương lai"
            label={`${futureDays} ngày`}
          />
        </div>

        <div>
          <Button
            onClick={() => mutate()}
            disabled={isLoading}
          >
            {isLoading ? "Đang tải..." : "Tải lại dữ liệu"}
          </Button>
          {isValidating && !isLoading && (
            <span className="ml-2 text-xs text-muted-foreground">(đang cập nhật)</span>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error instanceof Error ? error.message : "Lỗi không xác định"}
        </Alert>
      )}

      {data && (
        <div
          className={`grid grid-cols-1 gap-6 ${
            showBuy && showSell ? "lg:grid-cols-2" : ""
          }`}
        >
          {showBuy && (
            <SignalsTable
              title="MUA"
              data={data.buy}
              futureDays={data.future_days}
              variant="buy"
            />
          )}
          {showSell && (
            <SignalsTable
              title="BÁN"
              data={data.sell}
              futureDays={data.future_days}
              variant="sell"
            />
          )}
        </div>
      )}

      {data && data.buy.length === 0 && data.sell.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
          Không có tín hiệu nào cho ngày {date}
        </div>
      )}
    </div>
  )
}
