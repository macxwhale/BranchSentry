"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isApproved, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading) {
      if (!user || !isApproved) {
        router.push("/login")
      }
    }
  }, [user, isApproved, loading, router])

  if (loading || !user || !isApproved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
