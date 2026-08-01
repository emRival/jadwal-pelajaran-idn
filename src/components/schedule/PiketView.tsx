import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    AlertCircle,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { usePiketData } from '@/hooks/usePiketData';
import { PIKET_TYPES } from '@/lib/piketTypes';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DAYS_OF_WEEK_API, DAYS_OF_WEEK } from '@/types';

export function PiketView() {
    const { data, loading, error, lastUpdated, currentDayKey, apiUrl, apiLoading, refresh: fetchData } = usePiketData();
    const [selectedDay, setSelectedDay] = useState<string>(currentDayKey);

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
    );
}
