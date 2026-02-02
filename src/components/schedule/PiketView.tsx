import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Utensils,
    School,
    Building2,
    Laptop,
    Home,
    AlertCircle,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { usePiketApi } from '@/hooks/useFirebase';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DAYS_OF_WEEK_API } from '@/types';

interface PiketDayInfo {
    status: 'active' | 'puasa';
    guru: string[] | null;
}

interface PiketCategory {
    [day: string]: PiketDayInfo;
}

interface PiketData {
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

const PIKET_TYPES = [
    { key: 'piket_dapur', title: 'Piket Dapur', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'kelas_smp', title: 'Piket Kelas SMP', icon: School, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'kelas_smk', title: 'Piket Kelas SMK', icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { key: 'piket_laptop', title: 'Piket Laptop', icon: Laptop, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'piket_masjid', title: 'Piket Masjid', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export function PiketView() {
    const { apiUrl, loading: apiLoading } = usePiketApi();
    const [data, setData] = useState<PiketData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const dayKey = DAYS_OF_WEEK_API[new Date().getDay()];

    const fetchData = async (force = false) => {
        if (!apiUrl) {
            setError('URL API Piket belum diatur di panel admin.');
            return;
        }

        // Cache logic (1 hour)
        const cached = localStorage.getItem('piket_cache');
        const cachedTime = localStorage.getItem('piket_cache_time');
        const cachedUrl = localStorage.getItem('piket_cache_url');

        if (!force && cached && cachedTime && cachedUrl === apiUrl && (Date.now() - Number(cachedTime) < 3600000)) {
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
                localStorage.setItem('piket_cache', JSON.stringify(result));
                localStorage.setItem('piket_cache_time', String(Date.now()));
                localStorage.setItem('piket_cache_url', apiUrl);
            } else {
                throw new Error(result.message || 'Format data API tidak valid');
            }
        } catch (err: any) {
            console.error('Error fetching Piket data:', err);
            setError(err.message || 'Gagal memuat data piket');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!apiLoading && apiUrl) {
            fetchData();
        }
    }, [apiUrl, apiLoading]);

    if (apiLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Menghubungkan ke API Piket...</p>
            </div>
        );
    }

    if (!apiUrl) {
        return (
            <Alert variant="destructive" className="mx-auto max-w-2xl mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Konfigurasi Dibutuhkan</AlertTitle>
                <AlertDescription>
                    URL API Piket belum dikonfigurasi. Silakan hubungi admin atau atur di menu Settings.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Jadwal Piket
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="font-normal text-[10px] h-5">
                            {dayKey}
                        </Badge>
                        {lastUpdated && (
                            <span>
                                • {new Date(lastUpdated).toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="no-print h-8 w-8 p-0"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {error ? (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm font-semibold">Error</AlertTitle>
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            ) : loading && !data ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : data ? (
                <div className="grid gap-3">
                    {PIKET_TYPES.map((type, index) => {
                        const Icon = type.icon;
                        const categoryData = data.data[type.key as keyof typeof data.data];
                        const dayInfo = categoryData ? categoryData[dayKey] : null;

                        return (
                            <motion.div
                                key={type.key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="overflow-hidden border shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center">
                                        <div className={`p-3 sm:w-48 flex items-center gap-3 border-b sm:border-b-0 sm:border-r bg-muted/30`}>
                                            <div className={`p-1.5 rounded-md ${type.bg}`}>
                                                <Icon className={`h-4 w-4 ${type.color}`} />
                                            </div>
                                            <span className="font-medium text-sm">{type.title}</span>
                                        </div>
                                        <div className="p-3 flex-1">
                                            {dayInfo ? (
                                                dayInfo.status === 'puasa' ? (
                                                    <span className="text-muted-foreground italic text-sm">Libur / Puasa</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {dayInfo.guru && dayInfo.guru.length > 0 ? (
                                                            dayInfo.guru.map((guru, gIdx) => (
                                                                <span
                                                                    key={gIdx}
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                                                                >
                                                                    {guru}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
