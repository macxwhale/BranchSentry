"use client";

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentReference, DocumentData, DocumentSnapshot } from 'firebase/firestore';

interface UseDocResponse<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export function useDoc<T extends DocumentData>(
    ref: DocumentReference | null
): UseDocResponse<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const cacheKey = ref ? ref.path : 'null';
    const cachedRef = useRef(cacheKey);
    const cachedData = useRef(data);

    useEffect(() => {
        if (cachedRef.current !== cacheKey) {
            setLoading(true);
            cachedRef.current = cacheKey;
        }

        if (!ref) {
            setData(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            ref,
            (snapshot: DocumentSnapshot) => {
                if (snapshot.exists()) {
                    const newData = { id: snapshot.id, ...snapshot.data() } as T;
                    if (JSON.stringify(cachedData.current) !== JSON.stringify(newData)) {
                        setData(newData);
                        cachedData.current = newData;
                    }
                } else {
                    setData(null);
                }
                setLoading(false);
                setError(null);
            },
            err => {
                console.error("useDoc error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [cacheKey, ref]);

    return { data, loading, error };
}
