"use client"

import { useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { SignalsTable } from "./signals-table"
import { signalsDataSchema } from "@/lib/schemas"
import type { SignalsData } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

type SignalType = "ALL" | "BUY" | "SELL"

export function SignalsDashboard() {
  const { data: session } = useSession()
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [futureDays, setFutureDays] = useState(7)
  const [signalType, setSignalType] = useState<SignalType>("ALL")
  const [symbol, setSymbol] = useState("")

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
      onError: (err: Error) => {
        if (!err.message.includes("Session expired")) {
          console.error("[CLIENT] Signals fetch error:", err.message)
        }
      },
    }
  )

  const handleRefetch = useCallback(() => {
    mutate()
  }, [mutate])

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
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setDate(e.target.value)}
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
            onChange={(e) => setSignalType(e.target.value as SignalType)}
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
            onChange={(e) => setSymbol(e.target.value)}
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
            onChange={(e) => setFutureDays(Number(e.target.value))}
            aria-label="Số ngày hiển thị giá tương lai"
            label={`${futureDays} ngày`}
          />
        </div>

        <div>
          <Button
            onClick={handleRefetch}
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
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Lỗi không xác định"}
        </div>
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
