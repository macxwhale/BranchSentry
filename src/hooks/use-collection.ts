"use client";

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, Query, DocumentData, QuerySnapshot, collection, query as firestoreQuery } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseCollectionResponse<T> {
    data: T[] | null;
    loading: boolean;
    error: Error | null;
}

export function useCollection<T extends DocumentData>(
    q: Query | null,
): UseCollectionResponse<T> {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const cacheKey = q ? q.toString() : 'null';
    const cachedQuery = useRef(cacheKey);
    const cachedData = useRef(data);

    useEffect(() => {
        if (cachedQuery.current !== cacheKey) {
            setLoading(true);
            cachedQuery.current = cacheKey;
        }

        if (!q) {
            setData(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot: QuerySnapshot) => {
                const newData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as T[];

                if (JSON.stringify(cachedData.current) !== JSON.stringify(newData)) {
                    setData(newData);
                    cachedData.current = newData;
                }
                
                setLoading(false);
                setError(null);
            },
            err => {
                console.error("useCollection error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [cacheKey, q]);

    return { data, loading, error };
}
