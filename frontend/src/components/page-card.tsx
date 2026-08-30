// components/page-card.tsx
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card"

export function PageCard({ title, center = true, children}: { title?: string; center?: boolean; children: React.ReactNode}) {
    return (
        <div className={center ? "flex min-h-screen items-center justify-center" : "pt-12 flex justify-center"}>
            <Card className="w-full max-w-xl">
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