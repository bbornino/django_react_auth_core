// components/page-card.tsx
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PageCardProps = {
    title?: string
    center?: boolean
    maxWidth?: string
    children: React.ReactNode
}

export function PageCard({ title, center = true, maxWidth = "max-w-xl", children}: PageCardProps) {
    return (
        <div className={cn("px-4", center ? "flex min-h-screen items-center justify-center" : "pt-12 flex justify-center")}>
            <Card className={cn("w-full", maxWidth)}>
                {title && (
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-2xl">{title}</CardTitle>
                    </CardHeader>
                )}
                <CardContent className="space-y-4">{children}</CardContent>
            </Card>
        </div>
    )
}