"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

// Redirect to the dashboard page
export default function HomePage() {
  const router = useRouter()

  React.useEffect(() => {
    router.replace("/dashboard")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  )
}
