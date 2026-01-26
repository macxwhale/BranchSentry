import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-6 w-1/2" />
                </CardContent>
            </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
