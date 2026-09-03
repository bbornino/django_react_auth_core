import { type ColumnDef, 
    type Row,
    flexRender, 
    getCoreRowModel, 
    getSortedRowModel, 
    getPaginationRowModel, 
    getFilteredRowModel,
    useReactTable, 
    type SortingState, 
} from "@tanstack/react-table"
import { useState } from "react"
import { Search } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectInput } from "./select-input"


// Pure - given already-sorted rows and the column defs, returns exportable
// plain-object records. Takes rows/columns as parameters rather than closing
// over component state, so this is independently unit-testable (and
// reusable) with zero React involved. Only columns with a real accessorKey
// have a meaningful raw value - display-only columns (like an avtar, with no 
// accessorKey at all) are skipped rather than exporting blank cells or trying 
// to serialize rendered JSX.
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, not a component; exported specifically so it's independently unit-testable. Fast Refresh only degrades to a full reload for this file on save, which is a fine tradeoff for a file this size.
export function buildExportRows<TData> (
    rows: Row<TData>[],
    columns: ColumnDef<TData, unknown>[]
): Record<string, unknown>[]{
    const exportColumns = columns.filter(
        (col): col is ColumnDef<TData, unknown> & { accessorKey: string } =>
            "accessorKey" in col && typeof col.accessorKey === "string"
    )

    return rows.map((row) => {
        const record: Record<string, unknown> = {}
        exportColumns.forEach((col) => {
            const header = typeof col.header === "string" ? col.header : col.accessorKey
            record[header] = (row.original as Record<string, unknown>)[col.accessorKey]
        })
        return record
    })
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type DataTableProps<TData> = {
    columns: ColumnDef<TData, unknown>[]
    data: TData[]
    onRowClick?: (row: TData) => void
    exportFilename?: string
    enableExport?: boolean
    enableSearch?: boolean
    defaultPageSize?: number
}


export function DataTable<TData>({
    columns, data, onRowClick, exportFilename = "export", 
    enableExport = true, enableSearch = true, defaultPageSize = 10,
}: DataTableProps<TData>) {
    const [ sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState("")
    const [pageSizeSelection, setPageSizeSelection] = useState(String(defaultPageSize))

    const pageSizeOptions = [
        ...(
            PAGE_SIZE_OPTIONS.includes(defaultPageSize)
                ? PAGE_SIZE_OPTIONS
                : [... PAGE_SIZE_OPTIONS, defaultPageSize].sort((a, b) => a - b)
        ).map((size) => ({ value: String(size), label: String(size)})),
        { value: "all", label: "All" },
    ]

    const handlePageSizeChange = (value: string) => {
        setPageSizeSelection(value)
        const size = value === "all" 
                ? (table.getFilteredRowModel().rows.length || 1) : Number(value)
        table.setPageSize(size)
    }

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        state: { sorting, globalFilter },
    })

    const handleExportCsv = () => {
        const csv = Papa.unparse(buildExportRows(table.getSortedRowModel().rows, columns))
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"})
        const url = URL.createObjectURL(blob)
        const link = document.createElement(("a"))
        link.href = url
        link.download = `${exportFilename}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(buildExportRows(table.getSortedRowModel().rows, columns))
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
        XLSX.writeFile(workbook, `${exportFilename}.xlsx`)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                {enableSearch ? (
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                        <Input
                            placeholder="Search..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                ) : <div />}
                {enableExport && (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCsv}>
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel}>
                        Export Excel
                    </Button>
                </div>
            )}
            </div>
            
            
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} >
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                        {{ asc: " ↑", desc: " ↓"}[header.column.getIsSorted() as string] ?? ""}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}
                                    onClick={() => onRowClick?.(row.original)}
                                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <label htmlFor="page-size" 
                        className="text-sm text-muted-foreground">Rows per page</label>
                    <SelectInput 
                        id="page-size"
                        value={pageSizeSelection}
                        onValueChange={handlePageSizeChange}
                        options={pageSizeOptions}
                        className="w-20"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}