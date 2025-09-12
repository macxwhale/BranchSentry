"use client"

import * as React from "react"
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type User
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  loading: boolean
  isApproved: boolean
  login: (email: string, pass: string) => Promise<any>
  signup: (email: string, pass: string) => Promise<any>
  logout: () => Promise<any>
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  isApproved: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isApproved, setIsApproved] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const { toast } = useToast()

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists() && userDoc.data().approved) {
          setUser(user)
          setIsApproved(true)
        } else {
          setUser(null)
          setIsApproved(false)
          // This logs the user out if they are not approved or don't have a doc
          await signOut(auth) 
        }
      } else {
        setUser(null)
        setIsApproved(false)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])
  
  const login = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass)
    const user = userCredential.user

    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists() && userDoc.data().approved) {
      setUser(user)
      setIsApproved(true)
    } else {
      await signOut(auth)
      throw new Error("Your account is not yet approved.")
    }
  }

  const signup = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass)
    const user = userCredential.user
    
    // Create a document for the new user in Firestore
    const userDocRef = doc(db, "users", user.uid)
    await setDoc(userDocRef, {
      email: user.email,
      approved: false, // Default to not approved
    })

    // Log the user out immediately after signup
    await signOut(auth)
    
    toast({
      title: "Signup Successful",
      description: "Your account has been created and is awaiting approval.",
    });
  }

  const logout = () => {
    return signOut(auth)
  }

  const value = {
    user,
    loading,
    isApproved,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return React.useContext(AuthContext)
}
