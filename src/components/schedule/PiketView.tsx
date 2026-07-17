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
import { DAYS_OF_WEEK_API, DAYS_OF_WEEK } from '@/types';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';

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

    const currentDate = new Date();
    const currentDayKey = DAYS_OF_WEEK_API[currentDate.getDay()];
    const [selectedDay, setSelectedDay] = useState<string>(currentDayKey);

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
        <>
            {/* Print visibility control */}
            <style>{`
                #piket-screen { display: block; }
                #piket-print { display: none; }
                @media print {
                    #piket-screen { display: none !important; }
                    #piket-print { display: block !important; }
                    @page { size: landscape; margin: 8mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>

            {/* Screen View */}
            <div id="piket-screen" className="space-y-4 max-w-4xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Jadwal Piket
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="font-normal text-[10px] h-5">
                                {currentDayKey}
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
                        className="h-8 w-8 p-0"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <div className="flex gap-1.5 mb-4">
                    {DAYS_OF_WEEK_API.map((day, index) => {
                        const isToday = day === currentDayKey;
                        const isSelected = day === selectedDay;
                        const dayName = DAYS_OF_WEEK[index];
                        return (
                            <button
                                key={day}
                                className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-all duration-200 border ${isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : isToday
                                    ? 'bg-primary/10 text-primary border-primary/30'
                                    : 'bg-background text-muted-foreground border-border hover:bg-muted/50'}`}
                                onClick={() => setSelectedDay(day)}
                            >
                                {dayName.slice(0, 3)}
                            </button>
                        );
                    })}
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
                            const dayInfo = categoryData && categoryData[selectedDay] ? categoryData[selectedDay] : null;

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

            {/* Print View */}
            {data && (
                <div id="piket-print">
                    <div className="flex items-center gap-4 border-b-4 border-double border-slate-900 pb-3 mb-4">
                        <img src={logo} alt="Logo" className="h-14 w-14 object-contain" />
                        <div className="flex-1 text-center pr-12">
                            <h1 className="text-base font-extrabold tracking-wide text-slate-950 uppercase leading-none">IDN Boarding School Pamijahan</h1>
                            <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                                Jl. KH. Abdul Hamid, Desa Gunung Sari, Kec. Pamijahan, Kabupaten Bogor, Jawa Barat.
                            </p>
                            <p className="text-[8px] text-slate-500 font-mono mt-0.5 leading-none">
                                Website: idn.sch.id | Email: info@idn.sch.id
                            </p>
                        </div>
                    </div>
                    <div className="text-center mb-4 space-y-1">
                        <h3 className="text-[11px] font-extrabold tracking-widest text-slate-700 uppercase">Jadwal Piket Guru</h3>
                        <p className="text-[8px] text-slate-500 font-medium">Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear() + 1} | Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <table className="w-full text-[10px] leading-normal border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-900">
                                <th className="border border-slate-900 p-1.5 font-bold text-left w-28">Jenis Piket</th>
                                {DAYS_OF_WEEK.slice(1, 6).map((day) => (
                                    <th key={day} className="border border-slate-900 p-1.5 font-bold text-center uppercase">{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PIKET_TYPES.map((type) => {
                                const categoryData = data.data[type.key as keyof typeof data.data];
                                return (
                                    <tr key={type.key}>
                                        <td className="border border-slate-900 p-1.5 font-semibold bg-slate-50">{type.title}</td>
                                        {DAYS_OF_WEEK_API.slice(1, 6).map((day) => {
                                            const dayInfo = categoryData ? categoryData[day] : null;
                                            return (
                                                <td key={day} className="border border-slate-900 p-1.5 text-center align-top">
                                                    {dayInfo ? (
                                                        dayInfo.status === 'puasa' ? (
                                                            <span className="text-slate-400 italic">Puasa</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-0.5 justify-center">
                                                                {dayInfo.guru && dayInfo.guru.length > 0 ? (
                                                                    dayInfo.guru.map((guru, gIdx) => (
                                                                        <span key={gIdx} className="inline-block px-1 py-0 rounded bg-slate-100 text-[9px]">{guru}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="flex justify-around items-end mt-10 pt-2">
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] uppercase mb-1">Wakil Kepala (Kurikulum)</p>
                            <div className="h-16 mb-1"></div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">________________</p>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] uppercase mb-1">Kepala Unit</p>
                            <div className="h-16 mb-1"></div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">________________</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
