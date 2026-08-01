import { useState, useEffect, useCallback } from 'react';
import { usePiketApi } from '@/hooks/useFirebase';
import { DAYS_OF_WEEK_API } from '@/types';

export interface PiketDayInfo {
    status: 'active' | 'puasa';
    guru: string[] | null;
}

export interface PiketCategory {
    [day: string]: PiketDayInfo;
}

export interface PiketData {
    status: string;
    data: {
        piket_dapur: PiketCategory;
        kelas_smp: PiketCategory;
        kelas_smk: PiketCategory;
        piket_laptop: PiketCategory;
        piket_masjid: PiketCategory;
    };
    message?: string;
}

const CACHE_KEY = 'piket_cache';
const CACHE_TIME_KEY = 'piket_cache_time';
const CACHE_URL_KEY = 'piket_cache_url';
const CACHE_TTL = 3600000; // 1 hour

export function usePiketData() {
    const { apiUrl, loading: apiLoading } = usePiketApi();
    const [data, setData] = useState<PiketData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const currentDate = new Date();
    const currentDayKey = DAYS_OF_WEEK_API[currentDate.getDay()];

    const fetchData = useCallback(async (force = false) => {
        if (!apiUrl) {
            setError('URL API Piket belum diatur di panel admin.');
            return;
        }

        // Cache logic (1 hour)
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const cachedUrl = localStorage.getItem(CACHE_URL_KEY);

        if (!force && cached && cachedTime && cachedUrl === apiUrl && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
            setData(JSON.parse(cached));
            setLastUpdated(Number(cachedTime));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const result = await response.json();
            if (result.status === 'success' && result.data) {
                setData(result);
                setLastUpdated(Date.now());
                localStorage.setItem(CACHE_KEY, JSON.stringify(result));
                localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
                localStorage.setItem(CACHE_URL_KEY, apiUrl);
            } else {
                throw new Error(result.message || 'Format data API tidak valid');
            }
        } catch (err) {
            console.error('Error fetching Piket data:', err);
            setError(err instanceof Error ? err.message : 'Gagal memuat data piket');
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        if (!apiLoading && apiUrl) {
            fetchData();
        }
    }, [apiUrl, apiLoading, fetchData]);

    return { data, loading, error, lastUpdated, currentDayKey, apiUrl, apiLoading, refresh: fetchData };
}
