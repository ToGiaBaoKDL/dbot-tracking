"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { SignalsTable } from "./signals-table";
import { signalsDataSchema } from "@/lib/schemas";
import type { SignalsData, SignalType } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert } from "@/components/ui/alert";
import { useDebouncedCallback } from "@/lib/hooks";

function getValidSignalType(value: string | null): SignalType {
  if (value === "BUY" || value === "SELL") return value;
  return "ALL";
}

function getValidFutureDays(value: string | null): number {
  const n = Number(value);
  if (!Number.isNaN(n) && n >= 1 && n <= 14) return n;
  return 7;
}

export function SignalsDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Hydration-safe today: empty on server, set on client mount ──
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(format(new Date(), "yyyy-MM-dd"));
  }, []);

  // ── Committed values: read directly from URL (single source of truth) ──
  const committedDate = searchParams.get("date") || today || format(new Date(), "yyyy-MM-dd");
  const committedFutureDays = getValidFutureDays(searchParams.get("future_days"));
  const committedSignalType = getValidSignalType(searchParams.get("signal_type"));
  const committedSymbol = searchParams.get("symbol") || "";

  // ── Display state: local buffer for interactive inputs ──
  const [dateInput, setDateInput] = useState(committedDate);
  const [signalTypeInput, setSignalTypeInput] = useState<SignalType>(committedSignalType);
  const [symbolInput, setSymbolInput] = useState(committedSymbol);
  const [sliderValue, setSliderValue] = useState(committedFutureDays);

  // Sync display state when URL changes (browser back/forward / external navigation)
  useEffect(() => {
    const fallback = today || format(new Date(), "yyyy-MM-dd");
    setDateInput(searchParams.get("date") || fallback);
    setSignalTypeInput(getValidSignalType(searchParams.get("signal_type")));
    setSymbolInput(searchParams.get("symbol") || "");
    setSliderValue(getValidFutureDays(searchParams.get("future_days")));
  }, [searchParams, today]);

  // ── updateQuery: NEVER depend on searchParams to avoid feedback loops ──
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const updateQuery = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const newQuery = params.toString();
      const currentQuery = searchParamsRef.current.toString();
      // Guard: skip replace if URL hasn't actually changed
      if (newQuery !== currentQuery) {
        router.replace(`?${newQuery}`, { scroll: false });
      }
    },
    [router],
  );

  // ── Debounced callback for symbol (no effects, no loops) ──
  const debouncedUpdateSymbol = useDebouncedCallback((value: string) => {
    updateQuery({ symbol: value });
  }, 300);

  // ── Handlers ──
  const handleDateChange = (value: string) => {
    setDateInput(value);
    updateQuery({ date: value });
  };

  const handleSignalTypeChange = (value: SignalType) => {
    setSignalTypeInput(value);
    updateQuery({ signal_type: value });
  };

  const handleSymbolChange = (value: string) => {
    const upper = value.toUpperCase();
    setSymbolInput(upper);
    debouncedUpdateSymbol(upper.trim());
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
  };

  const handleSliderCommit = () => {
    updateQuery({ future_days: String(sliderValue) });
  };

  // ── API path derived from committed URL values only ──
  const path = useMemo(() => {
    const params = new URLSearchParams();
    params.set("date", committedDate);
    params.set("future_days", String(committedFutureDays));
    params.set("signal_type", committedSignalType);
    if (committedSymbol.trim()) {
      params.set("symbol", committedSymbol.trim());
    }
    return `/api/v1/signals?${params.toString()}`;
  }, [committedDate, committedFutureDays, committedSignalType, committedSymbol]);

  const { data, error, isValidating, mutate } = useSWR<SignalsData>(
    session?.accessToken ? [path, session.accessToken] : null,
    ([p, token]: [string, string]) => apiFetch(p, token, { schema: signalsDataSchema }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    },
  );

  const showBuy = committedSignalType === "ALL" || committedSignalType === "BUY";
  const showSell = committedSignalType === "ALL" || committedSignalType === "SELL";

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
            value={dateInput}
            max={today}
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
            value={signalTypeInput}
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
            value={symbolInput}
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
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            onKeyUp={(e) => {
              if (
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowUp" ||
                e.key === "ArrowDown"
              ) {
                handleSliderCommit();
              }
            }}
            aria-label="Số ngày hiển thị giá tương lai"
            label={`${sliderValue} ngày`}
          />
        </div>

        <div className="ml-auto">
          <Button onClick={() => mutate()} disabled={isValidating}>
            {isValidating ? "Đang tải..." : "Tải lại dữ liệu"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error instanceof Error ? error.message : "Lỗi không xác định"}
        </Alert>
      )}

      {data && (
        <div className={`grid grid-cols-1 gap-6 ${showBuy && showSell ? "lg:grid-cols-2" : ""}`}>
          {showBuy && (
            <SignalsTable
              title="MUA"
              data={data.buy}
              date={data.date}
              futureDates={data.future_dates}
              variant="buy"
            />
          )}
          {showSell && (
            <SignalsTable
              title="BÁN"
              data={data.sell}
              date={data.date}
              futureDates={data.future_dates}
              variant="sell"
            />
          )}
        </div>
      )}

      {data && data.buy.length === 0 && data.sell.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
          Không có tín hiệu nào cho ngày {committedDate}
        </div>
      )}
    </div>
  );
}
