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
import { cn } from '@/lib/utils';
import { useSchedules, useTeachers, useClasses, useTimeSlots, useSignatureSettings, useInfoLinks } from '@/hooks/useFirebase';
import { useNavigate } from 'react-router-dom';
import { LoginDialog } from '@/components/layout/LoginDialog';
import {
    getCurrentTimeSlot,
    getCurrentDay,
    getDayName,
    getLessonTimeSlots,
    getEntityColor
} from '@/lib/scheduleUtils';
import { DAYS_OF_WEEK, TimeSlot } from '@/types';
import { WeeklyGridView } from './WeeklyGridView';
import { PiketView } from './PiketView';
import { Info, ExternalLink } from 'lucide-react';
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

    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());
    const [dayLayout, setDayLayout] = useState<'horizontal' | 'vertical'>('horizontal');
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null);
    const [loginDialogOpen, setLoginDialogOpen] = useState(loginOpenDefault);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    const navigate = useNavigate();

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
                                            <DropdownMenuItem onClick={() => window.open(`/cetak/${viewMode === 'class' ? 'kelas' : 'guru'}/${encodeURIComponent(selectedEntity)}`, '_blank')}>
                                                Cetak {viewMode === 'class' ? 'Per Kelas' : 'Per Guru'} ({selectedEntity})
                                            </DropdownMenuItem>
                                        )}
                                        {viewMode !== 'teacher' && (
                                            <DropdownMenuItem onClick={() => window.open('/cetak/gabungan', '_blank')}>
                                                Cetak Semua (Gabungan)
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 no-print hover:bg-muted/50 transition-colors"
                                    onClick={() => window.open('/cetak/piket', '_blank')}
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
            <LoginDialog open={loginDialogOpen} onOpenChange={(open) => {
                setLoginDialogOpen(open);
                if (!open) navigate('/');
            }} />
        </div >
    );
}
