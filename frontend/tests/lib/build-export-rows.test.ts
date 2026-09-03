import { describe, it, expect } from "vitest"
import type { ColumnDef, Row } from "@tanstack/react-table"
import { buildExportRows } from "@/components/data-table"

type FakeUser = { id: number; name: string; email: string; avatar_url: string }

// TanStack's real Row objects are heavier than this — buildExportRows only
// ever reads `.original`, so a minimal double is enough here, same
// mocking-the-boundary approach used for allauth's SocialLogin earlier.
function fakeRow(original: FakeUser): Row<FakeUser> {
    return { original } as Row<FakeUser>
}

const columns: ColumnDef<FakeUser, unknown>[] = [
    { id: "avatar", header: "", cell: () => null }, // no accessorKey — display-only
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
]

describe("buildExportRows", () => {
    it("maps each row to a plain record keyed by column header", () => {
        const rows = [fakeRow({ id: 1, name: "Briana", email: "b@example.com", avatar_url: "" })]

        const result = buildExportRows(rows, columns)

        expect(result).toEqual([{ Name: "Briana", Email: "b@example.com" }])
    })

    it("skips columns with no accessorKey (display-only columns like avatar)", () => {
        const rows = [fakeRow({ id: 1, name: "Briana", email: "b@example.com", avatar_url: "pic.jpg" })]

        const result = buildExportRows(rows, columns)

        expect(result[0]).not.toHaveProperty("avatar")
        expect(result[0]).not.toHaveProperty("avatar_url")
    })

    it("falls back to the raw accessorKey as the header when header isn't a string", () => {
        const columnsWithNonStringHeader: ColumnDef<FakeUser, unknown>[] = [
            { accessorKey: "email", header: () => null }, // a render function, not a string
        ]
        const rows = [fakeRow({ id: 1, name: "Briana", email: "b@example.com", avatar_url: "" })]

        const result = buildExportRows(rows, columnsWithNonStringHeader)

        expect(result[0]).toEqual({ email: "b@example.com" })
    })

    it("returns an empty array for an empty row set", () => {
        expect(buildExportRows([], columns)).toEqual([])
    })

    it("preserves row order", () => {
        const rows = [
            fakeRow({ id: 1, name: "Briana", email: "b@example.com", avatar_url: "" }),
            fakeRow({ id: 2, name: "Brian", email: "brian@example.com", avatar_url: "" }),
        ]

        const result = buildExportRows(rows, columns)

        expect(result.map((r) => r.Name)).toEqual(["Briana", "Brian"])
    })
})
