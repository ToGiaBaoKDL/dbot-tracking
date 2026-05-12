"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { SignalsTable } from "./signals-table";
import { z } from "zod";
import { signalsDataSchema, watchlistWithSignalSchema } from "@/lib/schemas";
import type { SignalsData, SignalType } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function formatDateDMY(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
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
  const committedExcludedDates =
    searchParams
      .get("exclude_dates")
      ?.split(",")
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) ?? [];

  // ── Display state: local buffer for interactive inputs ──
  const [dateInput, setDateInput] = useState(committedDate);
  const [signalTypeInput, setSignalTypeInput] = useState<SignalType>(committedSignalType);
  const [symbolInput, setSymbolInput] = useState(committedSymbol);
  const [sliderValue, setSliderValue] = useState(committedFutureDays);
  const [excludeInput, setExcludeInput] = useState("");
  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null);

  // Sync display state when URL changes (browser back/forward / external navigation)
  useEffect(() => {
    const fallback = today || format(new Date(), "yyyy-MM-dd");
    setDateInput(searchParams.get("date") || fallback);
    setSignalTypeInput(getValidSignalType(searchParams.get("signal_type")));
    setSymbolInput(searchParams.get("symbol") || "");
    setSliderValue(getValidFutureDays(searchParams.get("future_days")));
  }, [searchParams, today]);

  // ── Watchlist for inline star toggles ──
  const { data: watchlistData, mutate: mutateWatchlist } = useSWR(
    session?.accessToken ? ["/api/v1/watchlist", session.accessToken] : null,
    ([path, token]: [string, string]) =>
      apiFetch(path, token, { schema: z.array(watchlistWithSignalSchema) }),
    { revalidateOnFocus: false },
  );

  const watchlistSymbols = useMemo(() => {
    if (!watchlistData || !Array.isArray(watchlistData)) return [];
    return watchlistData.map((w: { symbol: string }) => w.symbol);
  }, [watchlistData]);

  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const handleToggleWatchlist = useCallback(
    async (symbol: string) => {
      if (!session?.accessToken) return;
      const isInList = watchlistSymbols.includes(symbol);
      setTogglingSymbol(symbol);
      setWatchlistError(null);
      try {
        if (isInList) {
          await apiFetch(`/api/v1/watchlist/${symbol}`, session.accessToken, {
            method: "DELETE",
          });
        } else {
          await apiFetch("/api/v1/watchlist", session.accessToken, {
            method: "POST",
            body: JSON.stringify({ symbol }),
          });
        }
        mutateWatchlist();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        setWatchlistError(msg);
        console.error("[CLIENT] Watchlist toggle error:", err);
      } finally {
        setTogglingSymbol(null);
      }
    },
    [session?.accessToken, watchlistSymbols, mutateWatchlist],
  );

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

  const handleAddExclude = () => {
    if (!excludeInput) return;
    if (committedExcludedDates.includes(excludeInput)) {
      setExcludeInput("");
      return;
    }
    const next = [...committedExcludedDates, excludeInput].sort();
    updateQuery({ exclude_dates: next.join(",") });
    setExcludeInput("");
  };

  const handleRemoveExclude = (date: string) => {
    const next = committedExcludedDates.filter((d) => d !== date);
    updateQuery({ exclude_dates: next.join(",") });
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
    committedExcludedDates.forEach((d) => params.append("exclude_dates", d));
    return `/api/v1/signals?${params.toString()}`;
  }, [
    committedDate,
    committedFutureDays,
    committedSignalType,
    committedSymbol,
    committedExcludedDates,
  ]);

  const { data, error } = useSWR<SignalsData>(
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
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <span className="block text-sm font-medium text-card-foreground">Ngày</span>
          <div className="mt-1">
            <DatePicker value={dateInput} max={today} onChange={handleDateChange} />
          </div>
        </div>

        <div>
          <label htmlFor="signal-type" className="block text-sm font-medium text-card-foreground">
            Tín hiệu
          </label>
          <Select
            value={signalTypeInput}
            onValueChange={(v: string) => handleSignalTypeChange(v as SignalType)}
          >
            <SelectTrigger id="signal-type" className="mt-1 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="BUY">MUA</SelectItem>
              <SelectItem value="SELL">BÁN</SelectItem>
            </SelectContent>
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
          <div className="mt-1 flex h-9 items-center gap-3">
            <Slider
              id="future-days"
              value={[sliderValue]}
              onValueChange={([v]: number[]) => handleSliderChange(v)}
              onValueCommit={() => handleSliderCommit()}
              min={1}
              max={14}
              step={1}
              className="w-40"
              aria-label="Số ngày hiển thị giá tương lai"
            />
            <span className="w-12 text-sm font-medium tabular-nums text-card-foreground">
              {sliderValue}
            </span>
          </div>
        </div>

        <div className="w-full" />

        {/* Ngày nghỉ lễ */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">Ngày nghỉ lễ</span>
          <DatePicker value={excludeInput} onChange={setExcludeInput} placeholder="Chọn ngày" />

          {committedExcludedDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {committedExcludedDates.map((d) => (
                <Badge key={d} variant="secondary" className="gap-1 text-xs">
                  {formatDateDMY(d)}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveExclude(d)}
                    className="h-4 w-4"
                    aria-label={`Xóa ngày ${d}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleAddExclude}
            disabled={!excludeInput}
            aria-label="Thêm ngày nghỉ lễ"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : "Lỗi không xác định"}
          </AlertDescription>
        </Alert>
      )}

      {watchlistError && (
        <Alert variant="destructive">
          <AlertDescription>{watchlistError}</AlertDescription>
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
              watchlistSymbols={watchlistSymbols}
              onToggleWatchlist={handleToggleWatchlist}
              togglingSymbol={togglingSymbol}
            />
          )}
          {showSell && (
            <SignalsTable
              title="BÁN"
              data={data.sell}
              date={data.date}
              futureDates={data.future_dates}
              variant="sell"
              watchlistSymbols={watchlistSymbols}
              onToggleWatchlist={handleToggleWatchlist}
              togglingSymbol={togglingSymbol}
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
