"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { stocksResponseSchema } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BarChart3 } from "lucide-react";

const STORAGE_KEY = "dbot-stock-query";

interface StockSearchBoxProps {
  accessToken: string | undefined;
  defaultQuery?: string;
}

export function StockSearchBox({ accessToken, defaultQuery = "" }: StockSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Restore from sessionStorage on mount (only if no explicit default)
  useEffect(() => {
    if (defaultQuery) {
      setQuery(defaultQuery);
      return;
    }
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setQuery(saved);
    }
  }, [defaultQuery]);

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, query);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: stocksData } = useSWR(
    accessToken ? ["/api/v1/stocks", accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token, { schema: stocksResponseSchema }),
    { revalidateOnFocus: false },
  );

  const allSymbols = stocksData?.symbols ?? [];
  const term = query.trim();
  const filtered = term
    ? allSymbols.filter((s) => s.toUpperCase().includes(term.toUpperCase()))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;
    setOpen(false);
    router.push(`/stock/${term}`);
  };

  const handleSelect = (symbol: string) => {
    setQuery(symbol);
    setOpen(false);
    router.push(`/stock/${symbol}`);
  };

  return (
    <div ref={wrapperRef} className="relative max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="Nhập mã cổ phiếu (VD: VIC, FPT, HPG...)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Tìm kiếm">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {open && term && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <ul className="divide-y divide-border">
            {filtered.slice(0, 10).map((symbol) => (
              <li key={symbol}>
                <button
                  type="button"
                  onClick={() => handleSelect(symbol)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  {symbol}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length > 10 && (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              +{filtered.length - 10} kết quả khác…
            </p>
          )}
        </div>
      )}

      {open && term && filtered.length === 0 && allSymbols.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg">
          Không tìm thấy mã {term}
        </div>
      )}
    </div>
  );
}
