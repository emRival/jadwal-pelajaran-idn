import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Calendar,
    User,
    Clock,
    GraduationCap,
    ChevronDown,
    Loader2,
    Printer,
    ClipboardList,
    Check,
    ChevronsUpDown,
    Columns,
    Rows
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PrintLayout } from '@/components/print/PrintLayout';
import { FullSchedulePrint } from '@/components/print/FullSchedulePrint';
import { useSchedules, useTeachers, useClasses, useTimeSlots, useSignatureSettings, useInfoLinks, useTasks, useJpCalculationMethod } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getCurrentTimeSlot,
    getCurrentDay,
    getDayName,
    getLessonTimeSlots,
    getEntityColor,
    calculateTeacherJP
} from '@/lib/scheduleUtils';
import { DAYS_OF_WEEK, DAYS_OF_WEEK_API, TimeSlot } from '@/types';
import { WeeklyGridView } from './WeeklyGridView';
import { PiketView } from './PiketView';
import { Info, ExternalLink } from 'lucide-react';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';
type ViewMode = 'day' | 'class' | 'teacher' | 'piket';

function sortClasses(classes: string[]): string[] {
    return [...classes].sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
}

interface ScheduleViewProps {
    loginOpenDefault?: boolean;
}

export function ScheduleView({ loginOpenDefault = false }: ScheduleViewProps) {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { teachers, loading: teachersLoading } = useTeachers();
    const { classes, loading: classesLoading } = useClasses();
    const { timeSlots, loading: timeSlotsLoading } = useTimeSlots();

    const { settings: signatureSettings } = useSignatureSettings();
    const { infoLinks } = useInfoLinks();
    const { tasks } = useTasks();
    const { method } = useJpCalculationMethod();

    const [printMode, setPrintMode] = useState<'single' | 'combined' | null>(null);

    const handlePrint = (mode: 'single' | 'combined') => {
        setPrintMode(mode);

        const qrUrls = infoLinks.map(link =>
            `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link.url)}`
        );

        if (qrUrls.length === 0) {
            setTimeout(() => window.print(), 300);
            return;
        }

        let loaded = 0;
        let printed = false;
        const total = qrUrls.length;
        let fallbackTimeoutId: NodeJS.Timeout;

        const triggerPrint = () => {
            if (!printed) {
                printed = true;
                if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
                window.print();
            }
        };

        const onDone = () => {
            loaded++;
            if (loaded >= total) {
                setTimeout(triggerPrint, 200);
            }
        };

        qrUrls.forEach(url => {
            const img = new Image();
            img.onload = onDone;
            img.onerror = onDone;
            img.src = url;
        });

        fallbackTimeoutId = setTimeout(triggerPrint, 5000);
    };

    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());
    const [dayLayout, setDayLayout] = useState<'horizontal' | 'vertical'>('horizontal');
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null);
    const [loginDialogOpen, setLoginDialogOpen] = useState(loginOpenDefault);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    const { signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [loginError, setLoginError] = useState('');
    const handleLogin = async () => {
        setLoginError('');
        const result = await signInWithGoogle();
        if (result.success) {
            setLoginDialogOpen(false);
            navigate('/');
        } else if (result.error) {
            setLoginError(result.error);
        }
    };

    const loading = schedulesLoading || teachersLoading || classesLoading || timeSlotsLoading;

    // Filter time slots based on the selected day (saturday vs weekday)
    const dayTimeSlots = useMemo(() => {
        if (selectedDay === 6) {
            return timeSlots.filter(slot => slot.dayType === 'saturday');
        }
        return timeSlots.filter(slot => slot.dayType !== 'saturday');
    }, [timeSlots, selectedDay]);

    // Update current time slot every minute
    useEffect(() => {
        const updateCurrentSlot = () => {
            setCurrentTimeSlot(getCurrentTimeSlot(dayTimeSlots));
        };
        updateCurrentSlot();
        const interval = setInterval(updateCurrentSlot, 60000);
        return () => clearInterval(interval);
    }, [dayTimeSlots]);

    const lessonSlots = useMemo(() => getLessonTimeSlots(dayTimeSlots), [dayTimeSlots]);
    const classNames = useMemo(() => sortClasses(classes.map(c => c.name)), [classes]);

    const entities = useMemo(() => {
        if (viewMode === 'class') {
            return classes.map(c => c.name).sort();
        }
        if (viewMode === 'teacher') {
            return teachers.map(t => t.name).sort();
        }
        return [];
    }, [viewMode, classes, teachers]);

    const filteredEntities = useMemo(() => {
        if (!searchQuery) return entities;
        return entities.filter(e =>
            e.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [entities, searchQuery]);

    // Build schedule table for current view
    const tableData = useMemo(() => {
        if (viewMode !== 'day') return [];

        const entitiesToRender = selectedEntity
            ? [selectedEntity]
            : classes.map(c => c.name);

        return entitiesToRender.map(entity => ({
            entity,
            slots: lessonSlots.map(slot => ({
                slot,
                schedule: schedules.find(s =>
                    Number(s.day) === selectedDay &&
                    Number(s.jp) === Number(slot.jp) &&
                    s.classes?.includes(entity)
                )
            }))
        }));
    }, [selectedEntity, classes, lessonSlots, selectedDay, schedules, viewMode]);

    if (loading || !signatureSettings) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {printMode && (
                <style>
                    {`
                        @media print {
                            @page {
                                size: ${printMode === 'combined' ? 'landscape' : 'portrait'};
                                margin: 10mm;
                            }
                            body {
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    `}
                </style>
            )}

            {/* Piket Print View */}
            {viewMode === 'piket' && (
                <style>
                    {`
                        @media print {
                            @page {
                                size: portrait;
                                margin: 10mm;
                            }
                            body {
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    `}
                </style>
            )}

            {/* Controls */}
            <Card className="no-print">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-6">
                        {/* Main Tabs */}
                        <Tabs value={viewMode} onValueChange={(v) => {
                            setViewMode(v as ViewMode);
                            setSelectedEntity("");
                        }}>
                            <TabsList className="flex w-full md:w-auto overflow-x-auto no-scrollbar bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="day" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                                    <Calendar className="h-4 w-4" />
                                    Per Hari
                                </TabsTrigger>
                                <TabsTrigger value="class" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                                    <GraduationCap className="h-4 w-4" />
                                    Per Kelas
                                </TabsTrigger>
                                <TabsTrigger value="teacher" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                                    <User className="h-4 w-4" />
                                    Per Guru
                                </TabsTrigger>
                                <TabsTrigger value="piket" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                                    <ClipboardList className="h-4 w-4" />
                                    <span>Jadwal Piket Guru</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-2 border-t border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                            {viewMode === 'day' && (
                                <>
                                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                                        {DAYS_OF_WEEK.slice(1).map((day, index) => {
                                            const isToday = (index + 1) === getCurrentDay();
                                            const isSelected = selectedDay === (index + 1);
                                            return (
                                                <button
                                                    key={index + 1}
                                                    onClick={() => setSelectedDay(index + 1)}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                                        isSelected
                                                            ? 'bg-background text-foreground shadow-sm'
                                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                                    }`}
                                                >
                                                    <span className="flex flex-col items-center gap-0.5">
                                                        <span className="flex items-center gap-1">
                                                            {day === 'Sabtu' ? (
                                                                <>
                                                                    {day.slice(0, 3)}
                                                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-semibold leading-none">SG</span>
                                                                </>
                                                            ) : (
                                                                day.slice(0, 3)
                                                            )}
                                                        </span>
                                                        {isToday && (
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-primary/50'}`} />
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setDayLayout('horizontal')}
                                            title="Tampilan Horizontal (Baris Kelas)"
                                            className={`p-1.5 rounded-lg transition-all ${
                                                dayLayout === 'horizontal'
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                            }`}
                                        >
                                            <Rows className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDayLayout('vertical')}
                                            title="Tampilan Vertikal (Baris JP)"
                                            className={`p-1.5 rounded-lg transition-all ${
                                                dayLayout === 'vertical'
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                            }`}
                                        >
                                            <Columns className="h-4 w-4" />
                                        </button>
                                    </div>
                                </>
                            )}

                            {(viewMode === 'class' || viewMode === 'teacher') && (
                                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={comboboxOpen}
                                            className="w-full lg:w-[300px] justify-between h-10 px-3 font-normal"
                                        >
                                            {selectedEntity
                                                ? selectedEntity
                                                : `Cari ${viewMode === 'class' ? 'kelas' : 'guru'}...`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder={`Cari ${viewMode === 'class' ? 'kelas' : 'guru'}...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-1">
                                            {filteredEntities.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    Tidak ditemukan.
                                                </div>
                                            ) : (
                                                filteredEntities.map((entity) => (
                                                    <div
                                                        key={entity}
                                                        className={cn(
                                                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                                            selectedEntity === entity ? "bg-accent text-accent-foreground" : ""
                                                        )}
                                                        onClick={() => {
                                                            setSelectedEntity(entity);
                                                            setComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedEntity === entity ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {entity}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {viewMode !== 'piket' ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            disabled={(viewMode === 'class' || viewMode === 'teacher') && !selectedEntity}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 no-print hover:bg-muted/50 transition-colors"
                                        >
                                            <Printer className="h-4 w-4" />
                                            <span>Cetak Jadwal</span>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {selectedEntity && (
                                            <DropdownMenuItem onClick={() => handlePrint('single')}>
                                                Cetak {viewMode === 'class' ? 'Per Kelas' : 'Per Guru'} ({selectedEntity})
                                            </DropdownMenuItem>
                                        )}
                                        {viewMode !== 'teacher' && (
                                            <DropdownMenuItem onClick={() => handlePrint('combined')}>
                                                Cetak Semua (Gabungan)
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 no-print hover:bg-muted/50 transition-colors"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>Cetak Jadwal Piket</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Time Indicator */}
            {
                currentTimeSlot && currentTimeSlot.type === 'lesson' && selectedDay === getCurrentDay() && viewMode !== 'piket' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg no-print"
                    >
                        <Clock className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-800 font-medium">
                            Saat ini: JP {currentTimeSlot.jp} ({currentTimeSlot.startTime} - {currentTimeSlot.endTime})
                        </span>
                    </motion.div>
                )
            }

            {/* Main Content Area */}
            {
                viewMode === 'piket' ? (
                    <PiketView />
                ) : viewMode === 'day' ? (
                    <Card className="no-print">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Jadwal {getDayName(selectedDay)}
                                {selectedDay === 6 && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Stadium General</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                {dayLayout === 'horizontal' ? (
                                    <table className="w-full border-collapse schedule-grid">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-muted min-w-[120px]">Kelas</th>
                                                {lessonSlots.map((slot) => (
                                                    <th
                                                        key={slot.id}
                                                        className={
                                                            currentTimeSlot?.jp === slot.jp && selectedDay === getCurrentDay()
                                                                ? 'current-timeslot-header'
                                                                : ''
                                                        }
                                                    >
                                                        <div className="flex flex-col items-center py-1">
                                                            <span className="font-bold text-white">JP {slot.jp}</span>
                                                            <span className="text-xs text-slate-300">
                                                                {slot.startTime}-{slot.endTime}
                                                            </span>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={lessonSlots.length + 1} className="py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 border text-muted-foreground/60">
                                                                <Calendar className="h-6 w-6" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-semibold text-foreground/80">Jadwal Belum Tersedia</p>
                                                                <p className="text-xs max-w-xs mx-auto text-muted-foreground">Belum ada data pelajaran yang diinput untuk hari ini.</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                tableData.map(({ entity, slots }) => (
                                                    <tr key={entity}>
                                                        <td className="sticky left-0 z-10 bg-background font-medium">
                                                            {entity}
                                                        </td>
                                                        {slots.map(({ slot, schedule }) => (
                                                            <td
                                                                key={slot.id}
                                                                className={
                                                                    currentTimeSlot?.jp === slot.jp && selectedDay === getCurrentDay()
                                                                        ? 'current-timeslot'
                                                                        : ''
                                                                }
                                                            >
                                                                {schedule ? (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        className="p-2 rounded-lg shadow-sm border"
                                                                        style={{
                                                                            backgroundColor: getEntityColor(schedule.guru, 'teacher'),
                                                                            borderColor: 'rgba(0,0,0,0.1)'
                                                                        }}
                                                                    >
                                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">{schedule.mapel}</div>
                                                                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">{schedule.guru}</div>
                                                                    </motion.div>
                                                                ) : (
                                                                    <span className="text-slate-300 dark:text-slate-700 text-lg">—</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full border-collapse schedule-grid">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-muted min-w-[120px]">Jam Pelajaran</th>
                                                {classNames.map((cls: string) => (
                                                    <th key={cls}>{cls}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lessonSlots.length === 0 ? (
                                                <tr>
                                                    <td colSpan={classNames.length + 1} className="py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 border text-muted-foreground/60">
                                                                <Clock className="h-6 w-6" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-semibold text-foreground/80">Jam Pelajaran Belum Diatur</p>
                                                                <p className="text-xs max-w-xs mx-auto text-muted-foreground">Belum ada pengaturan waktu atau jam pelajaran untuk hari ini.</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                lessonSlots.map((slot) => {
                                                    if (slot.type === 'break') {
                                                        return (
                                                            <tr key={slot.id || slot.order} className="schedule-break-row">
                                                                <td className="sticky left-0 z-10 bg-muted font-bold text-center">
                                                                    {slot.startTime} - {slot.endTime}
                                                                </td>
                                                                <td colSpan={classNames.length} className="py-2 h-12 text-center">
                                                                    {slot.name || 'Istirahat'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return (
                                                        <tr key={slot.id}>
                                                            <td
                                                                className={`sticky left-0 z-10 bg-background font-medium text-center ${
                                                                    currentTimeSlot?.jp === slot.jp && selectedDay === getCurrentDay()
                                                                        ? 'current-timeslot-header'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <div className="flex flex-col items-center py-1">
                                                                    <span className="font-bold">JP {slot.jp}</span>
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {slot.startTime}-{slot.endTime}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            {classNames.map((cls: string) => {
                                                                const schedule = schedules.find(
                                                                    (s) =>
                                                                        Number(s.day) === selectedDay &&
                                                                        Number(s.jp) === Number(slot.jp) &&
                                                                        (s.classes || []).includes(cls)
                                                                );
                                                                return (
                                                                    <td
                                                                        key={cls}
                                                                        className={
                                                                            currentTimeSlot?.jp === slot.jp && selectedDay === getCurrentDay()
                                                                                ? 'current-timeslot'
                                                                                : ''
                                                                        }
                                                                    >
                                                                        {schedule ? (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                className="p-2 rounded-lg shadow-sm border"
                                                                                style={{
                                                                                    backgroundColor: getEntityColor(schedule.guru, 'teacher'),
                                                                                    borderColor: 'rgba(0,0,0,0.1)'
                                                                                }}
                                                                            >
                                                                                <div className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                                                                                    {schedule.mapel}
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                                                                                    {schedule.guru}
                                                                                </div>
                                                                            </motion.div>
                                                                        ) : (
                                                                            <span className="text-slate-300 dark:text-slate-700 text-lg">—</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : selectedEntity ? (
                    <Card className="no-print">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {viewMode === 'class' ? <GraduationCap className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                Jadwal Mingguan: {selectedEntity}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <WeeklyGridView
                                entityName={selectedEntity}
                                entityType={viewMode === 'class' ? 'class' : 'teacher'}
                                schedules={schedules}
                                timeSlots={timeSlots.filter(slot => slot.dayType !== 'saturday')}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="no-print border-dashed border-2 bg-muted/5 relative overflow-hidden">
                        <CardContent className="py-24 text-center">
                            {/* Decorative Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                            
                            <motion.div 
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="flex flex-col items-center gap-4 relative z-10"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background border shadow-sm text-primary/70">
                                    {viewMode === 'class' ? <GraduationCap className="h-8 w-8" /> : <User className="h-8 w-8" />}
                                </div>
                                <div className="space-y-1.5 max-w-sm">
                                    <h3 className="text-lg font-bold tracking-tight">Tampilkan Jadwal Mingguan</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Silakan pilih {viewMode === 'class' ? 'kelas' : 'guru'} dari dropdown pencarian di atas untuk memulai melihat visualisasi jadwal mingguan.
                                    </p>
                                </div>
                            </motion.div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Time Slots Legend */}
            {
                viewMode !== 'piket' && (
                    <Card className="no-print">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                                <Clock className="h-5 w-5 text-primary" />
                                Jadwal Waktu Jam Pelajaran
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {dayTimeSlots.map((slot) => {
                                    const isCurrent = currentTimeSlot?.id === slot.id;
                                    const isBreak = slot.type === 'break';
                                    return (
                                        <div
                                            key={slot.id}
                                            className={cn(
                                                "relative p-3 rounded-xl border flex flex-col justify-between gap-1.5 transition-all duration-300",
                                                isCurrent 
                                                    ? "bg-amber-500/10 border-amber-500/30 dark:border-amber-500/40 shadow-sm shadow-amber-500/10 scale-[1.02] ring-1 ring-amber-500/20"
                                                    : isBreak
                                                        ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20"
                                                        : "bg-background/40 hover:bg-background/80 border-border/80 hover:shadow-sm"
                                            )}
                                        >
                                            {isCurrent && (
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                </span>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                    isBreak 
                                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    {isBreak ? "Break" : `JP ${slot.jp}`}
                                                </span>
                                                <Clock className={cn(
                                                    "h-3.5 w-3.5 opacity-60",
                                                    isCurrent ? "text-amber-500" : "text-muted-foreground"
                                                )} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs leading-tight truncate">
                                                    {isBreak ? slot.name : `Jam Pelajaran ${slot.jp}`}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Portal Informasi Section */}
            {infoLinks.length > 0 && viewMode !== 'piket' && (
                <Card className="no-print mt-8 border-none shadow-lg bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/10">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <Info className="h-6 w-6 text-primary" />
                            Portal Informasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {infoLinks.map((link, index) => (
                                <motion.div
                                    key={link.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-4 bg-background/60 hover:bg-background/80 border border-border/50 rounded-xl transition-all hover:shadow-md group"
                                    >
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            <span className="font-semibold text-sm truncate">{link.title}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, '')}</span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Login Dialog */}
            <Dialog open={loginDialogOpen} onOpenChange={(open) => {
                setLoginDialogOpen(open);
                if (!open) navigate('/');
            }}>
                <DialogContent className="sm:max-w-[400px] overflow-hidden p-0 rounded-3xl border-0 shadow-[0_25px_60px_rgba(0,0,0,0.12)]">
                    {/* Header with gradient */}
                    <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 pt-10 pb-12 text-center text-white overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-sm pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5 blur-md pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
                                <img src={logo} alt="Logo IDN" className="h-12 w-12 object-contain drop-shadow" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight text-white">Selamat Datang</DialogTitle>
                                <DialogDescription className="text-sm text-white/75 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                                    Masuk untuk mengelola jadwal IDN Boarding School
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-7 space-y-5">
                        {loginError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm text-center py-2.5 px-3 rounded-xl">
                                {loginError}
                            </div>
                        )}

                        <Button
                            onClick={handleLogin} 
                            className="w-full flex items-center justify-center gap-3 h-12 text-[15px] font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md rounded-xl" 
                            size="lg"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Masuk dengan Google
                        </Button>

                        <div className="text-center">
                            <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
                                Khusus Pengelola & Admin
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Views - Hidden in UI, Visible in Print */}
            {
                printMode === 'single' && (
                    <div id="print-single-view" className="hidden print:block absolute top-0 left-0 w-full bg-white z-[50]">
                        {(() => {
                            const hasSaturday = schedules.some(s => 
                                Number(s.day) === 6 && 
                                (viewMode === 'class' ? (s.classes || []).includes(selectedEntity) : s.guru === selectedEntity)
                            );
                            const totalDays = hasSaturday ? 7 : 6;
                            const cols = totalDays + 1; // Days + Jam + Waktu = total columns

                            return (
                                <PrintLayout
                                    title={viewMode === 'class' ? `Jadwal Pelajaran Kelas ${selectedEntity}` : `Jadwal Mengajar ${selectedEntity}`}
                                    signatureSettings={signatureSettings}
                                    infoLinks={infoLinks}
                                    showQr={viewMode === 'class'}
                                >
                                    <div className="border border-slate-950 overflow-hidden rounded-md">
                                        <table className="w-full text-[12.5px] leading-normal print-table border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                                                    <th className="border-r border-slate-950 p-2 font-bold w-12 text-center">Jam</th>
                                                    <th className="border-r border-slate-950 p-2 font-bold w-20 text-center">Waktu</th>
                                                    {DAYS_OF_WEEK_API.slice(1, totalDays).map((day, idx) => (
                                                        <th key={day} className="border-r last:border-r-0 border-slate-950 p-2 font-bold uppercase text-center">{getDayName(idx + 1)}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {timeSlots.filter(slot => slot.dayType !== 'saturday').sort((a, b) => a.order - b.order).map(slot => {
                                                    if (slot.type === 'break') {
                                                        return (
                                                            <tr key={slot.id} className="border-b border-slate-950 bg-emerald-50/50">
                                                                <td colSpan={cols} className="text-center font-bold py-1.5 text-[11.5px] text-emerald-800 tracking-wide">{slot.name}</td>
                                                            </tr>
                                                        )
                                                    }
                                                    return (
                                                        <tr key={slot.id} className="border-b last:border-b-0 border-slate-950">
                                                            <td className="border-r border-slate-950 text-center p-2 font-semibold bg-slate-50/40">{slot.jp}</td>
                                                            <td className="border-r border-slate-950 text-center p-2 font-mono text-[11px] bg-slate-50/20">{slot.startTime}-{slot.endTime}</td>
                                                            {DAYS_OF_WEEK_API.slice(1, totalDays).map((_, dayIdx) => {
                                                                const dayNum = dayIdx + 1;
                                                                const schedule = schedules.find(s =>
                                                                    Number(s.day) === dayNum &&
                                                                    Number(s.jp) === Number(slot.jp) &&
                                                                    (viewMode === 'class' ? (s.classes || []).includes(selectedEntity) : s.guru === selectedEntity)
                                                                );

                                                                const cellColor = schedule
                                                                    ? getEntityColor(
                                                                        viewMode === 'class' ? schedule.guru : schedule.mapel,
                                                                        viewMode === 'class' ? 'teacher' : 'subject'
                                                                    )
                                                                    : undefined;

                                                                return (
                                                                    <td 
                                                                        key={dayNum} 
                                                                        className="border-r last:border-r-0 border-slate-950 text-center p-2 align-middle"
                                                                        style={cellColor ? { backgroundColor: cellColor } : undefined}
                                                                    >
                                                                        {schedule ? (
                                                                            <div className="space-y-1.5">
                                                                                <div className="font-bold text-slate-900 leading-normal">{schedule.mapel}</div>
                                                                                <div className="text-[12px] text-slate-700 font-semibold">{viewMode === 'class' ? schedule.guru : (schedule.classes || []).join(', ')}</div>
                                                                            </div>
                                                                        ) : <span className="text-slate-300">-</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {viewMode === 'teacher' && selectedEntity && (
                                        <div className="mt-4 border border-slate-950 p-3 text-[10px] rounded-md">
                                            <h3 className="font-bold border-b border-slate-950 mb-2 pb-1.5 uppercase tracking-wide text-slate-800">Detail Beban Mengajar & Tugas</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <table className="w-full border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="py-1">Beban Mengajar</td>
                                                                <td className="py-1 text-right font-bold">{calculateTeacherJP(selectedEntity, schedules, method)} JP</td>
                                                            </tr>
                                                            {(() => {
                                                                const teacher = teachers.find(t => t.name === selectedEntity);
                                                                const teacherTasks = teacher?.tasks?.map(taskId => tasks.find(t => t.id === taskId)).filter(Boolean) || [];
                                                                const taskJp = teacherTasks.reduce((acc, t) => acc + (t?.jp || 0), 0);
                                                                const grandTotal = calculateTeacherJP(selectedEntity, schedules, method) + taskJp;

                                                                return (
                                                                    <>
                                                                        {teacherTasks.map((task, i) => (
                                                                            <tr key={i} className="text-muted-foreground">
                                                                                <td className="py-0.5 pr-2">• {task?.name}</td>
                                                                                <td className="py-0.5 text-right">{task?.jp} JP</td>
                                                                            </tr>
                                                                        ))}
                                                                        <tr className="border-t border-slate-950 font-bold">
                                                                            <td className="py-1">Total Beban Tugas</td>
                                                                            <td className="py-1 text-right">{grandTotal} JP</td>
                                                                        </tr>
                                                                    </>
                                                                );
                                                            })()}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="text-[9px] italic text-muted-foreground flex items-end justify-end">
                                                    * 1 JP = {timeSlots.find(s => s.type === 'lesson')?.startTime && timeSlots.find(s => s.type === 'lesson')?.endTime ?
                                                        (parseInt(timeSlots.find(s => s.type === 'lesson')!.endTime.split(':')[0]) * 60 + parseInt(timeSlots.find(s => s.type === 'lesson')!.endTime.split(':')[1])) -
                                                        (parseInt(timeSlots.find(s => s.type === 'lesson')!.startTime.split(':')[0]) * 60 + parseInt(timeSlots.find(s => s.type === 'lesson')!.startTime.split(':')[1]))
                                                        : 45} Menit
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </PrintLayout>
                            );
                        })()}
                    </div>
                )
            }

            {
                printMode === 'combined' && (
                    <div id="print-combined-view" className="hidden print:block bg-white z-[50]">
                        <FullSchedulePrint
                            schedules={schedules}
                            timeSlots={timeSlots}
                            signatureSettings={signatureSettings}
                            infoLinks={infoLinks}
                            showQr={false}
                        />
                    </div>
                )
            }
        </div >
    );
}
