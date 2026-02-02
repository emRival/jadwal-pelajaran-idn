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
    ChevronsUpDown
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    DialogHeader,
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
import { LogIn, Info, ExternalLink } from 'lucide-react';

type ViewMode = 'day' | 'class' | 'teacher' | 'piket';

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
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null);
    const [loginDialogOpen, setLoginDialogOpen] = useState(loginOpenDefault);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    const { signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            setLoginDialogOpen(false);
            navigate('/');
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const loading = schedulesLoading || teachersLoading || classesLoading || timeSlotsLoading;

    // Update current time slot every minute
    useEffect(() => {
        const updateCurrentSlot = () => {
            setCurrentTimeSlot(getCurrentTimeSlot(timeSlots));
        };
        updateCurrentSlot();
        const interval = setInterval(updateCurrentSlot, 60000);
        return () => clearInterval(interval);
    }, [timeSlots]);

    const lessonSlots = useMemo(() => getLessonTimeSlots(timeSlots), [timeSlots]);

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
                                <div className="flex items-center gap-2 bg-background border rounded-lg px-2 h-10">
                                    <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                                    <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                                        <SelectTrigger className="border-0 focus:ring-0 w-[130px] font-medium shadow-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS_OF_WEEK.slice(1).map((day, index) => (
                                                <SelectItem key={index + 1} value={String(index + 1)}>
                                                    {day}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 no-print hover:bg-muted/50 transition-colors">
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
                                    <DropdownMenuItem onClick={() => handlePrint('combined')}>
                                        Cetak Semua (Gabungan)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
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
                                                <td colSpan={lessonSlots.length + 1} className="text-center py-8 text-muted-foreground">
                                                    Belum ada data jadwal
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
                                                                    <div className="font-bold text-sm text-slate-800 leading-tight">{schedule.mapel}</div>
                                                                    <div className="text-[10px] text-slate-600 mt-1">{schedule.guru}</div>
                                                                </motion.div>
                                                            ) : (
                                                                <span className="text-slate-300 text-lg">—</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
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
                                timeSlots={timeSlots}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="no-print">
                        <CardContent className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                {viewMode === 'class' ? <GraduationCap className="h-12 w-12 opacity-20" /> : <User className="h-12 w-12 opacity-20" />}
                                <p className="text-lg font-medium">Silakan pilih {viewMode === 'class' ? 'kelas' : 'guru'} untuk melihat jadwal mingguan</p>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Time Slots Legend */}
            {
                viewMode !== 'piket' && (
                    <Card className="no-print">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Jadwal Waktu
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {timeSlots.map((slot) => (
                                    <Badge
                                        key={slot.id}
                                        variant={slot.type === 'break' ? 'secondary' : 'outline'}
                                        className={
                                            currentTimeSlot?.id === slot.id
                                                ? 'ring-2 ring-amber-400 ring-offset-2'
                                                : ''
                                        }
                                    >
                                        {slot.type === 'break' ? (
                                            <span className="text-green-600">{slot.name}</span>
                                        ) : (
                                            <span>JP {slot.jp}</span>
                                        )}
                                        : {slot.startTime} - {slot.endTime}
                                    </Badge>
                                ))}
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <LogIn className="h-6 w-6" />
                            Login Admin
                        </DialogTitle>
                        <DialogDescription>
                            Gunakan akun Google IDN untuk mengakses fitur manajemen jadwal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-6">
                        <Button
                            onClick={handleLogin}
                            size="lg"
                            className="w-full flex items-center justify-center gap-3 py-6 text-lg font-semibold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            <svg className="h-5 w-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Lanjutkan dengan Google
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Views - Hidden in UI, Visible in Print */}
            {
                printMode === 'single' && (
                    <div id="print-single-view" className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white z-[50]">
                        <PrintLayout
                            title={viewMode === 'class' ? `Jadwal Pelajaran Kelas ${selectedEntity}` : `Jadwal Mengajar ${selectedEntity}`}
                            signatureSettings={signatureSettings}
                            infoLinks={infoLinks}
                            showQr={viewMode === 'class'}
                        >
                            <div className="border border-black">
                                <table className="w-full text-[10px] leading-tight print-table border-collapse">
                                    {/* ... table content identical to before ... */}
                                    <thead>
                                        <tr>
                                            <th className="border border-black p-1 bg-gray-100">Jam</th>
                                            <th className="border border-black p-1 bg-gray-100">Waktu</th>
                                            {DAYS_OF_WEEK_API.slice(1, 6).map((day, idx) => (
                                                <th key={day} className="border border-black p-1 bg-gray-100 uppercase">{getDayName(idx + 1)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeSlots.sort((a, b) => a.order - b.order).map(slot => {
                                            if (slot.type === 'break') {
                                                return (
                                                    <tr key={slot.id}>
                                                        <td colSpan={7} className="border border-black bg-green-50 text-center font-bold py-1">{slot.name}</td>
                                                    </tr>
                                                )
                                            }
                                            return (
                                                <tr key={slot.id}>
                                                    <td className="border border-black text-center p-1">{slot.jp}</td>
                                                    <td className="border border-black text-center p-1 font-mono">{slot.startTime}-{slot.endTime}</td>
                                                    {DAYS_OF_WEEK_API.slice(1, 6).map((_, dayIdx) => {
                                                        const dayNum = dayIdx + 1;
                                                        const schedule = schedules.find(s =>
                                                            Number(s.day) === dayNum &&
                                                            Number(s.jp) === Number(slot.jp) &&
                                                            (viewMode === 'class' ? (s.classes || []).includes(selectedEntity) : s.guru === selectedEntity)
                                                        );

                                                        return (
                                                            <td key={dayNum} className="border border-black text-center p-1">
                                                                {schedule ? (
                                                                    <>
                                                                        <div className="font-bold">{schedule.mapel}</div>
                                                                        <div className="text-[10px]">{viewMode === 'class' ? schedule.guru : (schedule.classes || []).join(', ')}</div>
                                                                    </>
                                                                ) : '-'}
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
                                <div className="mt-4 border border-black p-2 text-[10px]">
                                    <h3 className="font-bold border-b border-black mb-2 pb-1 uppercase">Detail Beban Mengajar & Tugas</h3>
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
                                                                <tr className="border-t border-black font-bold">
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
                    </div>
                )
            }

            {
                printMode === 'combined' && (
                    <div id="print-combined-view" className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white z-[50]">
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
