import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"

type FakeUser = { id: number; name: string; email: string }

const columns: ColumnDef<FakeUser, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
]

const data: FakeUser[] = [
    { id: 1, name: "Briana", email: "briana@example.com" },
    { id: 2, name: "Brian", email: "brian@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
]

describe("DataTable", () => {
    it("renders every row's data by default", () => {
        render(<DataTable columns={columns} data={data} />)

        expect(screen.getByText("Briana")).toBeInTheDocument()
        expect(screen.getByText("Brian")).toBeInTheDocument()
        expect(screen.getByText("Charlie")).toBeInTheDocument()
    })

    it("shows the empty-state message when there's no data", () => {
        render(<DataTable columns={columns} data={[]} />)
        expect(screen.getByText("No results.")).toBeInTheDocument()
    })

    it("searching narrows visible rows to matching ones only", async () => {
        const user = userEvent.setup()
        render(<DataTable columns={columns} data={data} />)

        await user.type(screen.getByPlaceholderText("Search..."), "briana")

        expect(screen.getByText("Briana")).toBeInTheDocument()
        expect(screen.queryByText("Brian")).not.toBeInTheDocument()
        expect(screen.queryByText("Charlie")).not.toBeInTheDocument()
    })

    it("clicking a column header sorts by that column", async () => {
        const user = userEvent.setup()
        render(<DataTable columns={columns} data={data} />)

        await user.click(screen.getByText("Name"))

        // After ascending sort, Brian should render before Briana/Charlie —
        // checking the actual DOM order, not just presence, since presence
        // alone wouldn't prove sorting did anything at all.
        const cells = screen.getAllByRole("cell").map((cell) => cell.textContent)
        const nameCells = cells.filter((text) => ["Briana", "Brian", "Charlie"].includes(text ?? ""))
        expect(nameCells[0]).toBe("Brian")
    })

    it("clicking a row calls onRowClick with that row's original data", async () => {
        const user = userEvent.setup()
        const handleRowClick = vi.fn()
        render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />)

        await user.click(screen.getByText("Briana"))

        expect(handleRowClick).toHaveBeenCalledWith(data[0])
    })

    it("changing the page size shows more rows per page", async () => {
        const user = userEvent.setup()
        const manyRows: FakeUser[] = Array.from({ length: 15 }, (_, i) => ({
            id: i, name: `User ${i}`, email: `user${i}@example.com`,
        }))
        render(<DataTable columns={columns} data={manyRows} defaultPageSize={10} />)

        // Default page size is 10 — row 11 shouldn't be visible yet.
        expect(screen.queryByText("User 10")).not.toBeInTheDocument()

        await user.click(screen.getByRole("combobox"))
        await user.click(screen.getByRole("option", { name: "All" }))

        expect(screen.getByText("User 10")).toBeInTheDocument()
        expect(screen.getByText("User 14")).toBeInTheDocument()
    })

    it("hides export buttons when enableExport is false", () => {
        render(<DataTable columns={columns} data={data} enableExport={false} />)
        expect(screen.queryByText("Export CSV")).not.toBeInTheDocument()
        expect(screen.queryByText("Export Excel")).not.toBeInTheDocument()
    })

    it("hides the search box when enableSearch is false", () => {
        render(<DataTable columns={columns} data={data} enableSearch={false} />)
        expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument()
    })
})
