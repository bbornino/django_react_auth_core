import { useAuthStore } from "@/stores/auth-store"

export function Dashboard() {
    const user = useAuthStore((state) => state.user)
    return <pre>{JSON.stringify(user, null, 2)}</pre>
    // return (<div>Here is our super secret Dashboard.</div>)

}