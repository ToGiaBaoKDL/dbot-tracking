"use client"

import { useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import type { SignalItem } from "@/lib/schemas"

interface SignalsTableProps {
  title: string
  data: SignalItem[]
  futureDays: number
  variant: "buy" | "sell"
}

export function SignalsTable({ title, data, futureDays, variant }: SignalsTableProps) {
  const columns = useMemo<ColumnDef<SignalItem>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Ngày",
      },
      {
        accessorKey: "symbol",
        header: "Mã",
        cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.symbol}</span>,
      },
      {
        accessorKey: "volume",
        header: "Khối lượng",
        cell: ({ row }) => row.original.volume?.toLocaleString("vi-VN") ?? "-",
      },
      {
        accessorKey: "signal",
        header: "Tín hiệu",
        cell: ({ row }) => {
          const sig = row.original.signal
          if (!sig) {
            return <span className="text-xs text-muted-foreground">-</span>
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
          )
        },
      },
      {
        accessorKey: "price_x",
        header: "Giá X",
        cell: ({ row }) => row.original.price_x ?? "-",
      },
      ...Array.from({ length: futureDays }, (_, i) => ({
        accessorKey: `future_${i + 1}`,
        header: `Giá X+${i + 1}`,
        cell: ({ row }: { row: { original: SignalItem } }) => {
          const price = row.original.future_prices[i]
          return price?.toFixed(2) ?? "-"
        },
      })),
    ],
    [futureDays, variant]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
        <table
          className="w-full text-sm"
          aria-label={`Bảng tín hiệu ${title}`}
        >
          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
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
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2 text-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">Không có tín hiệu {title}</div>
      )}
    </div>
  )
}
