"use client";

import { useMemo, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { stockHistoryItemSchema, type StockHistoryItem } from "@/lib/schemas";
import { AppHeader } from "@/components/app-header";
import { StockSearchBox } from "@/features/stock/stock-search-box";
import { z } from "zod";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;

const historySchema = z.array(stockHistoryItemSchema);

function getPaginationRange(currentPage: number, pageCount: number): (number | string)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const pages: (number | string)[] = [];

  // Always show first page
  pages.push(0);

  if (currentPage > 3) {
    pages.push("...");
  }

  const start = Math.max(1, currentPage - 1);
  const end = Math.min(pageCount - 2, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < pageCount - 4) {
    pages.push("...");
  }

  // Always show last page
  pages.push(pageCount - 1);

  return pages;
}

export default function StockDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const symbol = String(params.symbol ?? "").toUpperCase();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const accessToken = session?.accessToken;

  const { data: history, isLoading } = useSWR<StockHistoryItem[]>(
    accessToken && symbol ? [`/api/v1/stocks/${symbol}/history`, accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token, { schema: historySchema }),
    { revalidateOnFocus: false },
  );

  // Compute prev-day price for each row to determine color
  const rowsWithPrev = useMemo(() => {
    if (!history) return [];
    return history.map((row, idx) => ({
      ...row,
      prevPrice: idx < history.length - 1 ? history[idx + 1].close_price : null,
    }));
  }, [history]);

  const columns = useMemo<ColumnDef<(typeof rowsWithPrev)[number]>[]>(
    () => [
      {
        accessorKey: "record_date",
        header: "Ngày",
        cell: ({ row }) => {
          const d = row.original.record_date;
          return new Date(d).toLocaleDateString("vi-VN");
        },
      },
      {
        accessorKey: "symbol",
        header: "Mã",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.original.symbol}</span>
        ),
      },
      {
        accessorKey: "close_price",
        header: "Giá",
        cell: ({ row }) => {
          const price = row.original.close_price;
          const prev = row.original.prevPrice;
          if (price == null) return "—";

          let colorClass = "text-foreground";
          if (prev != null && prev !== 0) {
            colorClass =
              price > prev ? "text-success" : price < prev ? "text-destructive" : "text-foreground";
          }

          return (
            <span className={`tabular-nums font-medium ${colorClass}`}>{price.toFixed(2)}</span>
          );
        },
      },
      {
        accessorKey: "volume",
        header: "Khối lượng",
        cell: ({ row }) =>
          row.original.volume != null ? row.original.volume.toLocaleString("vi-VN") : "—",
      },
      {
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const signal = row.original.signal;
          if (signal === "BUY") {
            return <div className="h-5 w-16 rounded-sm bg-success" />;
          }
          if (signal === "SELL") {
            return <div className="h-5 w-16 rounded-sm bg-destructive" />;
          }
          return <div className="h-5 w-16 rounded-sm bg-muted" />;
        },
      },
      {
        accessorKey: "signal",
        header: "Tín hiệu",
        cell: ({ row }) => {
          const signal = row.original.signal;
          if (!signal) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Badge
              variant="outline"
              className={
                signal === "BUY"
                  ? "border-success/40 bg-success/15 text-success font-medium"
                  : "border-destructive/40 bg-destructive/15 text-destructive font-medium"
              }
            >
              {signal === "BUY" ? "MUA" : "BÁN"}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  const [pagination, setPagination] = useState<PaginationState>(() => {
    if (typeof window === "undefined") {
      return { pageIndex: 0, pageSize: PAGE_SIZE };
    }
    const stored = sessionStorage.getItem(`dbot-stock-table-page-${symbol}`);
    const pageIndex = stored ? parseInt(stored, 10) : 0;
    return { pageIndex: Number.isNaN(pageIndex) ? 0 : pageIndex, pageSize: PAGE_SIZE };
  });

  useEffect(() => {
    sessionStorage.setItem(`dbot-stock-table-page-${symbol}`, String(pagination.pageIndex));
  }, [pagination, symbol]);

  const table = useReactTable({
    data: rowsWithPrev,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const pageRange = useMemo(
    () => getPaginationRange(currentPage, pageCount),
    [currentPage, pageCount],
  );

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-6">
          <StockSearchBox accessToken={accessToken} defaultQuery={symbol} />
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Không có dữ liệu</h3>
            <p className="mt-1 text-muted-foreground">Không tìm thấy lịch sử cho mã {symbol}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-4 py-2.5 text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Trang {currentPage + 1} / {pageCount} ({history.length} dòng)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    {"<<"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {pageRange.map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        type="button"
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 px-0"
                        onClick={() => table.setPageIndex(page as number)}
                      >
                        {(page as number) + 1}
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(pageCount - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    {">>"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
