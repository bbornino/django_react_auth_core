import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { type CellContext, type ColumnDef } from "@tanstack/react-table"
import { useAuthStore } from "@/stores/auth-store"
import { apiClient } from "@/lib/api-client"
import { PageCard } from "@/components/page-card"
import { DataTable } from "@/components/data-table"
import { UserAvatar } from "@/components/user-avatar"

type ListedUser = {
    id: number
    email: string
    name: string
    is_active: boolean
    role: string
    is_staff: boolean
    date_joined: string
    avatar_url: string
}

const columns: ColumnDef<ListedUser, unknown>[] = [
    {
        id: "avatar",
        header: "",
        cell: ({ row }: CellContext<ListedUser, unknown>) => (
            <UserAvatar avatarUrl={row.original.avatar_url} name={row.original.name} size={32} />
        ),
        enableSorting: false,
    },
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }: CellContext<ListedUser, unknown>) => (
            <span className="capitalize">{row.original.role}</span>
        )
    },
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }: CellContext<ListedUser, unknown>) => (
            row.original.is_active ? "Active" : "Inactive"
        ),
    },
    {
        accessorKey: "is_staff",
        header: "Staff",
        cell: ({ row }: CellContext<ListedUser, unknown>) => (
            row.original.is_staff ? "Yes" : "No"
        ),
    },
    {
        accessorKey: "date_joined",
        header: "Joined",
        cell: ({ row }: CellContext<ListedUser, unknown>) => (
            new Date(row.original.date_joined).toLocaleDateString()
        ),
        sortingFn: "datetime",
    }
]

export function ListUsersPage() {
    const navigate = useNavigate()
    const currentUser = useAuthStore((state) => state.user)
    const [users, setUsers] = useState<ListedUser[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate("/dashboard")
            return
        }

        apiClient.get("/users/")
            .then((res) => setUsers(res.data))
            .catch(() => navigate("/dashboard"))
            .finally(() => setLoading(false))
    }, [currentUser, navigate])

    if (loading) return <div className="p-4">Loading users...</div>

    return (
        <PageCard title="System Users" center={false}>
            <DataTable
                columns={columns}
                data={users}
                onRowClick={(user) => navigate(`/edit-profile/${user.id}`)}
            />
        </PageCard>
    )
}