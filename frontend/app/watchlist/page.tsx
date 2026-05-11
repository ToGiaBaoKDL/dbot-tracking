"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useThemeToggle } from "@/lib/hooks";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { z } from "zod";
import {
  watchlistWithSignalSchema,
  stocksResponseSchema,
  type WatchlistWithSignal,
} from "@/lib/schemas";
import { useFormMessage } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Star,
  BarChart3,
  X,
  Loader2,
  Moon,
  Sun,
  LogOut,
  Shield,
} from "lucide-react";

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDark, handleToggle, mounted } = useThemeToggle();
  const { message, isError, setSuccess, setError, clear } = useFormMessage();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [symbolInput, setSymbolInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const accessToken = session?.accessToken;

  const {
    data: watchlist,
    mutate,
    isLoading,
  } = useSWR<WatchlistWithSignal[]>(
    accessToken ? ["/api/v1/watchlist", accessToken] : null,
    ([path, token]: [string, string]) =>
      apiFetch(path, token, { schema: z.array(watchlistWithSignalSchema) }),
    { revalidateOnFocus: false },
  );

  const { data: stocksData } = useSWR(
    accessToken ? ["/api/v1/stocks", accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token, { schema: stocksResponseSchema }),
    { revalidateOnFocus: false },
  );

  const allSymbols = stocksData?.symbols ?? [];

  const filteredSymbols = useMemo(() => {
    const query = symbolInput.trim().toUpperCase();
    if (!query) return [];
    return allSymbols.filter((s) => s.includes(query)).slice(0, 10);
  }, [symbolInput, allSymbols]);

  const filteredWatchlist = useMemo(() => {
    const query = searchQuery.trim().toUpperCase();
    if (!query) return watchlist ?? [];
    return (watchlist ?? []).filter((w) => w.symbol.includes(query));
  }, [searchQuery, watchlist]);

  const handleAdd = async () => {
    if (!symbolInput.trim()) return;
    setAddError(null);
    setAdding(true);
    try {
      await apiFetch("/api/v1/watchlist", accessToken!, {
        method: "POST",
        body: JSON.stringify({ symbol: symbolInput.trim().toUpperCase() }),
      });
      setSuccess(`Đã thêm ${symbolInput.trim().toUpperCase()} vào danh sách theo dõi`);
      setSymbolInput("");
      setAddError(null);
      setShowAddDialog(false);
      mutate();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Thêm thất bại");
      // Keep dialog open on error so user can retry
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    clear();
    setRemovingSymbol(symbol);
    try {
      await apiFetch(`/api/v1/watchlist/${symbol}`, accessToken!, {
        method: "DELETE",
      });
      setSuccess(`Đã xóa ${symbol} khỏi danh sách theo dõi`);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setRemovingSymbol(null);
    }
  };

  const handleViewSignals = (symbol: string) => {
    router.push(`/?symbol=${symbol}`);
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  const isAdmin = session?.user?.is_admin === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3 sm:px-10 sm:py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-card-foreground sm:text-xl">
              Danh sách theo dõi
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.push("/")}
              aria-label="Tín hiệu"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => router.push("/admin/token")}
                aria-label="Trang quản trị"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleToggle}
              aria-label="Toggle theme"
            >
              {mounted ? (
                isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <span className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                await signOut({ callbackUrl: "/login" }).catch(() => {});
              }}
            >
              <span className="hidden sm:inline">Đăng xuất</span>
              <LogOut className="sm:hidden h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {message && (
          <Alert variant={isError ? "destructive" : "success"} className="mb-6">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Search + Add */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm kiếm mã CK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">{watchlist?.length ?? 0} mã</span>
          <Button onClick={() => setShowAddDialog(true)} className="ml-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm mã CK
          </Button>
        </div>

        {/* Watchlist Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="mt-3 h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-20" />
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <Star className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {searchQuery ? "Không tìm thấy mã nào" : "Chưa có mã nào trong danh sách"}
            </h3>
            <p className="mt-1 text-muted-foreground">
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Thêm mã chứng khoán để theo dõi tín hiệu"}
            </p>
            {!searchQuery && (
              <Button className="mt-6" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm mã CK
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredWatchlist.map((item) => (
              <WatchlistCard
                key={item.symbol}
                item={item}
                onView={() => handleViewSignals(item.symbol)}
                onRemove={() => handleRemove(item.symbol)}
                isRemoving={removingSymbol === item.symbol}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setAddError(null);
            setSymbolInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Thêm mã chứng khoán
            </DialogTitle>
            <DialogDescription>Nhập mã CK để thêm vào danh sách theo dõi</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="VD: VNM, HPG, FPT..."
                  value={symbolInput}
                  onChange={(e) => {
                    setSymbolInput(e.target.value.toUpperCase());
                    setAddError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  autoFocus
                  className={`uppercase ${addError ? "border-destructive" : ""}`}
                  aria-invalid={addError ? "true" : "false"}
                />
                {symbolInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSymbolInput("");
                      setAddError(null);
                    }}
                    aria-label="Xóa"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {addError && <p className="mt-1.5 text-sm text-destructive">{addError}</p>}
            </div>

            {filteredSymbols.length > 0 && (
              <div className="rounded-md border border-border bg-muted/50 p-2">
                <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">Gợi ý</p>
                <div className="flex flex-wrap gap-1.5">
                  {filteredSymbols.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSymbolInput(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAdd} disabled={adding || !symbolInput.trim()}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WatchlistCard({
  item,
  onView,
  onRemove,
  isRemoving,
}: {
  item: WatchlistWithSignal;
  onView: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const signalColor =
    item.latest_signal === "BUY"
      ? "bg-success/15 text-success border-success/30"
      : item.latest_signal === "SELL"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border";

  const changeColor =
    item.change_pct === null
      ? "text-muted-foreground"
      : item.change_pct >= 0
        ? "text-success"
        : "text-destructive";

  const ChangeIcon =
    item.change_pct === null ? Minus : item.change_pct >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">{item.symbol}</h3>
          {item.latest_date && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(item.latest_date).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
        <Badge variant="outline" className={`${signalColor} font-medium`}>
          {item.latest_signal ?? "—"}
        </Badge>
      </div>

      {/* Price & Change */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Giá đóng cửa</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {item.close_price !== null ? item.close_price.toLocaleString("vi-VN") : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">% Thay đổi</p>
          <p
            className={`flex items-center justify-end gap-1 text-sm font-medium tabular-nums ${changeColor}`}
          >
            <ChangeIcon className="h-3.5 w-3.5" />
            {item.change_pct !== null
              ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(2)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Volume */}
      {item.volume !== null && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            Khối lượng: {item.volume.toLocaleString("vi-VN")}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 opacity-60 transition-opacity group-hover:opacity-100">
        <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Xem tín hiệu
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Xóa ${item.symbol}`}
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
