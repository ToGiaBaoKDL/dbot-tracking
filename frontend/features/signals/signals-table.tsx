"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileDown,
  Percent,
  Star,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { SignalItem } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

interface SignalsTableProps {
  title: string;
  data: SignalItem[];
  date: string;
  futureDates: string[];
  variant: "buy" | "sell";
  watchlistSymbols?: string[];
  onToggleWatchlist?: (symbol: string) => void;
  togglingSymbol?: string | null;
}

const PAGE_SIZE = 10;

function downloadCSV(title: string, data: SignalItem[], date: string, futureDates: string[]) {
  const headers = [
    "Mã",
    "Khối lượng",
    "Tín hiệu",
    format(parseISO(date), "dd/MM"),
    ...futureDates.map((d) => format(parseISO(d), "dd/MM")),
  ];
  const rows = data.map((row) => [
    row.symbol,
    row.volume?.toString() ?? "",
    row.signal ?? "",
    row.price_x?.toString() ?? "",
    ...(row.future_prices ?? []).map((p) => p?.toFixed(2) ?? ""),
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SignalsTable({
  title,
  data,
  date,
  futureDates,
  variant,
  watchlistSymbols = [],
  onToggleWatchlist,
  togglingSymbol,
}: SignalsTableProps) {
  const router = useRouter();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showPercent, setShowPercent] = useState(false);

  // Reset to first page when data changes (new filter / new date)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data]);

  const columns = useMemo<ColumnDef<SignalItem>[]>(
    () => [
      {
        id: "watchlist",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const symbol = row.original.symbol;
          const isInList = watchlistSymbols.includes(symbol);
          const isLoading = togglingSymbol === symbol;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onToggleWatchlist?.(symbol)}
              disabled={!onToggleWatchlist || isLoading}
              aria-label={isInList ? `Xóa ${symbol} khỏi theo dõi` : `Thêm ${symbol} vào theo dõi`}
              aria-pressed={isInList}
            >
              <Star
                className={`h-3.5 w-3.5 transition-colors ${
                  isInList
                    ? "fill-primary text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              />
            </Button>
          );
        },
      },
      {
        accessorKey: "symbol",
        header: "Mã",
        enableSorting: false,
        meta: { frozen: true, offset: 0 },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => router.push(`/stock/${row.original.symbol}`)}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.original.symbol}
          </button>
        ),
      },
      {
        accessorKey: "volume",
        header: "Khối lượng",
        enableSorting: true,
        cell: ({ row }) => row.original.volume?.toLocaleString("vi-VN") ?? "-",
      },
      {
        accessorKey: "signal",
        header: "Tín hiệu",
        enableSorting: false,
        cell: ({ row }) => {
          const sig = row.original.signal;
          if (!sig) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                variant === "buy"
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {sig}
            </span>
          );
        },
      },
      {
        accessorKey: "price_x",
        header: format(parseISO(date), "dd/MM"),
        enableSorting: false,
        cell: ({ row }) => row.original.price_x ?? "-",
      },
      ...(futureDates ?? []).map((dateStr, i) => ({
        accessorKey: `future_${i}`,
        header: format(parseISO(dateStr), "dd/MM"),
        enableSorting: false,
        cell: ({ row }: { row: { original: SignalItem } }) => {
          const price = row.original.future_prices?.[i];
          if (price == null) return "-";

          if (!showPercent) {
            return price.toFixed(2);
          }

          const base = row.original.price_x;
          if (base == null || base === 0) return "-";

          const pct = ((price - base) / base) * 100;
          const isPositive = pct >= 0;
          return (
            <span className={isPositive ? "text-success" : "text-destructive"}>
              {isPositive ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          );
        },
      })),
    ],
    [futureDates, variant, showPercent, watchlistSymbols, onToggleWatchlist, togglingSymbol],
  );

  const table = useReactTable({
    data,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageCount = table.getPageCount();
  const canPrevious = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2
          className={`text-lg font-semibold ${
            variant === "buy" ? "text-success" : "text-destructive"
          }`}
        >
          {title} ({data.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPercent((p) => !p)}
            className={showPercent ? "bg-muted" : ""}
            aria-label={showPercent ? "Hiển thị giá" : "Hiển thị % thay đổi"}
          >
            <Percent className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(title, data, date, futureDates)}
            disabled={data.length === 0}
            aria-label={`Tải xuống CSV ${title}`}
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={`Bảng tín hiệu ${title}`}>
          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { frozen?: boolean; offset?: number }
                    | undefined;
                  const isFrozen = meta?.frozen;
                  const offset = meta?.offset ?? 0;
                  const isSorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={`whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground ${
                        isFrozen ? `sticky z-20 bg-muted shadow-[2px_0_0_0_hsl(var(--border))]` : ""
                      } ${canSort ? "cursor-pointer select-none" : ""}`}
                      style={isFrozen ? { left: offset } : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        isSorted === "asc"
                          ? "ascending"
                          : isSorted === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isSorted === "asc" && <ArrowUp className="h-3 w-3" aria-hidden="true" />}
                        {isSorted === "desc" && (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { frozen?: boolean; offset?: number }
                    | undefined;
                  const isFrozen = meta?.frozen;
                  const offset = meta?.offset ?? 0;
                  return (
                    <td
                      key={cell.id}
                      className={`whitespace-nowrap px-3 py-2 text-foreground tabular-nums ${
                        isFrozen ? `sticky z-10 bg-card shadow-[2px_0_0_0_hsl(var(--border))]` : ""
                      }`}
                      style={isFrozen ? { left: offset } : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">Không có tín hiệu {title}</div>
      )}

      {data.length > 0 && pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Trang {pagination.pageIndex + 1} / {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!canPrevious}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!canNext}
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
