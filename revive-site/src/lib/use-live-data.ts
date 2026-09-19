"use client";

import { useState, useEffect } from 'react';

interface LiveDataState<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
}

export function useLiveData<T>(url: string, interval: number = 10000, fallback?: T): LiveDataState<T> {
  const [state, setState] = useState<LiveDataState<T>>({
    data: fallback ?? null,
    isLoading: true,
    isOffline: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        
        if (isMounted) {
          setState({
            data: json,
            isLoading: false,
            isOffline: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isOffline: true,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    };

    fetchData();

    const intervalId = setInterval(fetchData, interval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url, interval]);

  return state;
}
