
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useDoc } from "./use-doc";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

type UserProfile = {
    id: string;
    email: string;
    approved: boolean;
};

export function useUser() {
    const { user, loading: authLoading } = useAuth();
    const userDocRef = React.useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    return {
        user,
        profile: userProfile,
        isApproved: userProfile?.approved ?? false,
        loading: authLoading || profileLoading,
    };
}

    