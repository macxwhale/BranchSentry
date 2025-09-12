"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export default function LoginPage() {
  const [loginEmail, setLoginEmail] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")
  const [signupEmail, setSignupEmail] = React.useState("")
  const [signupPassword, setSignupPassword] = React.useState("")
  const [signupSuccess, setSignupSuccess] = React.useState(false)

  const [loading, setLoading] = React.useState(false)
  const { login, signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(loginEmail, loginPassword)
      router.push("/dashboard")
    } catch (error: any) {
      const errorMessage = error.message === "Your account is not yet approved."
        ? error.message
        : "Invalid email or password."
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      })
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signup(signupEmail, signupPassword)
      setSignupSuccess(true)
      setSignupEmail("")
      setSignupPassword("")

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
       <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Password</Label>                  <Input
                    id="password-login"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
           <Card>
            {!signupSuccess ? (
              <>
                <CardHeader>
                  <CardTitle>Sign Up</CardTitle>
                  <CardDescription>
                    Create a new account to get started. Your account will require admin approval.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Password</Label>
                      <Input
                        id="password-signup"
                        type="password"
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing up..." : "Sign Up"}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : (
              <CardHeader className="text-center">
                 <CardTitle>Thank You for Signing Up!</CardTitle>
                 <CardDescription className="pt-2">
                    Your account has been successfully created and is now awaiting approval from an administrator. You will not be able to log in until your account has been approved.
                 </CardDescription>
              </CardHeader>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
