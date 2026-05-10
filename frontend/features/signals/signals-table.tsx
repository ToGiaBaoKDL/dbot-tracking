"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { SignalItem } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

interface SignalsTableProps {
  title: string;
  data: SignalItem[];
  date: string;
  futureDates: string[];
  variant: "buy" | "sell";
}

const PAGE_SIZE = 10;

export function SignalsTable({ title, data, date, futureDates, variant }: SignalsTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Reset to first page when data changes (new filter / new date)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data]);

  const columns = useMemo<ColumnDef<SignalItem>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Mã",
        enableSorting: false,
        meta: { frozen: true, offset: 0 },
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.original.symbol}</span>
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
          return price?.toFixed(2) ?? "-";
        },
      })),
    ],
    [futureDates, variant],
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
      <div className="border-b border-border px-4 py-3">
        <h2
          className={`text-lg font-semibold ${
            variant === "buy" ? "text-success" : "text-destructive"
          }`}
        >
          {title} ({data.length})
        </h2>
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
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!canNext}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
