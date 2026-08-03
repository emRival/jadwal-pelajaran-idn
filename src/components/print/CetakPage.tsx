import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { openInNewTab } from '@/lib/utils';
import { SingleSchedulePrint } from './SingleSchedulePrint';
import { TeacherStatsPrint } from './TeacherStatsPrint';
import { PiketPrint } from './PiketPrint';
import { FullSchedulePrint } from './FullSchedulePrint';
import { useTeacherStats } from '@/hooks/useTeacherStats';
import { usePiketData } from '@/hooks/usePiketData';
import {
    useSchedules,
    useTeachers,
    useTimeSlots,
    useSignatureSettings,
    useInfoLinks,
    useTasks,
    useJpCalculationMethod
} from '@/hooks/useFirebase';
import { InfoLink } from '@/types';

function PageLoader({ label = 'Memuat data...' }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">{label}</p>
        </div>
    );
}

function PageMessage({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <div>
                <h2 className="font-bold text-lg text-foreground">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <a href="/" className="text-sm font-medium text-primary hover:underline">Kembali ke halaman utama</a>
        </div>
    );
}

function SingleCetak({ entityType, entityName, infoLinks }: { entityType: 'class' | 'teacher'; entityName: string; infoLinks: InfoLink[] }) {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { timeSlots, loading: timeSlotsLoading } = useTimeSlots();
    const { settings: signatureSettings } = useSignatureSettings();
    const { teachers, loading: teachersLoading } = useTeachers();
    const { tasks } = useTasks();
    const { method } = useJpCalculationMethod();

    if (schedulesLoading || timeSlotsLoading || teachersLoading) {
        return <PageLoader />;
    }

    return (
        <SingleSchedulePrint
            entityType={entityType}
            entityName={entityName}
            schedules={schedules}
            timeSlots={timeSlots}
            signatureSettings={signatureSettings}
            infoLinks={infoLinks}
            teachers={teachers}
            tasks={tasks}
            method={method}
        />
    );
}

function GabunganCetak({ infoLinks }: { infoLinks: InfoLink[] }) {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { timeSlots, loading: timeSlotsLoading } = useTimeSlots();
    const { settings: signatureSettings } = useSignatureSettings();

    if (schedulesLoading || timeSlotsLoading) {
        return <PageLoader />;
    }

    return (
        <FullSchedulePrint
            schedules={schedules}
            timeSlots={timeSlots}
            signatureSettings={signatureSettings}
            infoLinks={infoLinks}
            showQr={false}
        />
    );
}

function StatistikCetak({ infoLinks }: { infoLinks: InfoLink[] }) {
    const { filteredStats, loading } = useTeacherStats();
    const { settings: signatureSettings } = useSignatureSettings();

    if (loading) {
        return <PageLoader />;
    }

    return <TeacherStatsPrint stats={filteredStats} signatureSettings={signatureSettings} infoLinks={infoLinks} />;
}

function PiketCetak() {
    const { data, loading, error, apiLoading, apiUrl } = usePiketData();

    if (apiLoading) {
        return <PageLoader label="Menghubungkan ke API Piket..." />;
    }

    if (!apiUrl) {
        return (
            <PageMessage
                title="Konfigurasi Dibutuhkan"
                description="URL API Piket belum dikonfigurasi. Silakan hubungi admin atau atur di menu Settings."
            />
        );
    }

    if (loading && !data) {
        return <PageLoader />;
    }

    if (error && !data) {
        return <PageMessage title="Gagal Memuat Data Piket" description={error} />;
    }

    if (!data) {
        return <PageMessage title="Data Piket Tidak Tersedia" />;
    }

    return <PiketPrint data={data} />;
}

export function CetakPage({ forcedType }: { forcedType?: string } = {}) {
    const { type: routeType, entity } = useParams();
    // The static /cetak/statistik route has no URL params, so the admin guard passes
    // the type explicitly via forcedType; otherwise read it from the route.
    const type = forcedType || routeType;
    const { infoLinks } = useInfoLinks();

    // Preload QR codes in the background so they're cached before printing
    useEffect(() => {
        infoLinks.forEach(link => {
            const img = new Image();
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link.url)}`;
        });
    }, [infoLinks]);

    const isLandscape = type === 'gabungan' || type === 'piket';

    const titles: Record<string, string> = {
        kelas: entity ? `Cetak Jadwal Kelas ${entity}` : 'Cetak Jadwal Kelas',
        guru: entity ? `Cetak Jadwal Guru ${entity}` : 'Cetak Jadwal Guru',
        gabungan: 'Cetak Jadwal Gabungan SMP',
        statistik: 'Cetak Statistik Guru',
        piket: 'Cetak Jadwal Piket Guru',
    };

    const title = type && titles[type] ? titles[type] : 'Cetak';

    const renderDocument = () => {
        switch (type) {
            case 'kelas':
            case 'guru':
                if (!entity) {
                    return <PageMessage title="Tautan Tidak Valid" description={`Parameter ${type} tidak ditemukan di URL.`} />;
                }
                return <SingleCetak entityType={type === 'kelas' ? 'class' : 'teacher'} entityName={entity} infoLinks={infoLinks} />;
            case 'gabungan':
                return <GabunganCetak infoLinks={infoLinks} />;
            case 'statistik':
                return <StatistikCetak infoLinks={infoLinks} />;
            case 'piket':
                return <PiketCetak />;
            default:
                return (
                    <PageMessage
                        title="Tautan Cetak Tidak Valid"
                        description="Gunakan tombol Cetak pada halaman Jadwal atau Statistik Guru untuk membuka halaman ini."
                    />
                );
        }
    };

    const handleBack = () => {
        window.close();
        // Fallback if the page was not opened via window.open (close() is ignored).
        // For same-tab navigation (e.g. statistik print opened from /teachers), go back
        // to the previous page; otherwise return to the home page.
        setTimeout(() => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        }, 100);
    };

    // iOS home-screen web apps run in "standalone" mode, where window.print() is a
    // silent no-op. In that mode we open the current page in Safari instead (via an
    // <a target="_blank">, which iOS opens in Safari) and let the user print there.
    const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true);

    const handlePrint = () => {
        if (isStandalone) {
            openInNewTab(window.location.href);
        } else {
            window.print();
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white print:min-h-0">
            <style>
                {`
                    @media print {
                        @page {
                            size: ${isLandscape ? 'landscape' : 'portrait'};
                            margin: 10mm;
                        }
                        html, body {
                            background: white !important;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                    }
                `}
            </style>

            {/* Toolbar - hidden in print */}
            <div className="no-print sticky top-0 z-50 border-b bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Printer className="h-5 w-5 text-primary flex-shrink-0" />
                        <h1 className="font-bold text-sm truncate">{title}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={handleBack}>
                            <ArrowLeft className="h-4 w-4 mr-1.5" />
                            Kembali
                        </Button>
                        <Button size="sm" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-1.5" />
                            {isStandalone ? 'Buka di Safari & Cetak' : 'Cetak'}
                        </Button>
                    </div>
                </div>
                {isStandalone && (
                    <div className="bg-amber-50 border-t border-amber-200 px-4 py-1.5 text-center">
                        <p className="text-xs text-amber-800">
                            Mode aplikasi tidak mendukung cetak langsung. Tombol di atas akan membuka halaman ini di Safari untuk dicetak.
                        </p>
                    </div>
                )}
            </div>

            {/* Document Preview - A4 sized on screen, full page in print */}
            <div className="py-6 px-3 sm:px-6 print:py-0 print:px-0">
                <div
                    className={`mx-auto bg-white shadow-lg border border-slate-200 rounded-lg p-3 md:p-5 print:!w-auto print:!max-w-none print:!p-0 print:!border-0 print:!shadow-none print:!rounded-none ${isLandscape ? 'w-[1123px]' : 'w-[794px]'} max-w-full print:bg-white`}
                >
                    {renderDocument()}
                </div>
            </div>
        </div>
    );
}
