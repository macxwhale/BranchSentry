"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GitBranch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Authentication failed:", error)
      // Optionally, show a toast notification to the user
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm rounded-lg bg-background p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="group flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GitBranch className="h-6 w-6 transition-all group-hover:scale-110" />
          </div>
          <h1 className="text-2xl font-semibold">Branch Sentry</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>
        <Button
          onClick={handleSignIn}
          className="w-full"
          disabled={loading}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}
