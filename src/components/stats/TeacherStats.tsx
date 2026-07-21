import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Search,
    BarChart3,
    Clock,
    ChevronDown,
    ChevronUp,
    Loader2,
    Printer
} from 'lucide-react';

import { PrintLayout } from '@/components/print/PrintLayout';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';


import { useSchedules, useTeachers, useTasks, useJpCalculationMethod, useSignatureSettings, useInfoLinks } from '@/hooks/useFirebase';
import { calculateTeacherJP } from '@/lib/scheduleUtils';
import { DAYS_OF_WEEK } from '@/types';

export function TeacherStats() {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { teachers, loading: teachersLoading } = useTeachers();
    const { tasks } = useTasks();
    const { method } = useJpCalculationMethod();
    const { settings: signatureSettings } = useSignatureSettings();
    const { infoLinks } = useInfoLinks();

    const [isPrinting, setIsPrinting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'jp'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

    const loading = schedulesLoading || teachersLoading;

    // Calculate stats for each teacher (weekday only, excluding Saturday, excluding staff)
    const teacherStats = useMemo(() => {
        const weekdaySchedules = schedules.filter(s => Number(s.day) >= 1 && Number(s.day) <= 5);
        const guruList = teachers.filter(t => t.role !== 'staff');
        return guruList.map(teacher => {
            const teacherSchedules = weekdaySchedules.filter(s => s.guru === teacher.name);
            const totalJp = calculateTeacherJP(teacher.name, weekdaySchedules, method);

            // Group by day (weekday only)
            const byDay: Record<number, number> = {};
            for (let day = 1; day <= 5; day++) {
                const daySchedules = teacherSchedules.filter(s => Number(s.day) === day);
                byDay[day] = daySchedules.reduce((acc, s) => {
                    if (method === 'byClass') {
                        return acc + (s.classes?.length || 1);
                    }
                    return acc + 1;
                }, 0);
            }

            // Get task JP
            const teacherTasks = teacher.tasks?.map(taskId => {
                const task = tasks.find(t => t.id === taskId);
                return task;
            }).filter((t): t is typeof tasks[0] => !!t) || [];

            const taskJp = teacherTasks.reduce((acc, task) => acc + (task?.jp || 0), 0);

            return {
                ...teacher,
                totalJp,
                taskJp,
                tasks: teacherTasks,
                grandTotal: totalJp + taskJp,
                byDay,
                schedules: teacherSchedules
            };
        });
    }, [teachers, schedules, tasks, method]);

    // Filter and sort
    const filteredStats = useMemo(() => {
        let result = teacherStats;

        if (searchQuery) {
            result = result.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        result.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else {
                comparison = a.totalJp - b.totalJp;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [teacherStats, searchQuery, sortBy, sortOrder]);

    const guruCount = useMemo(() => teachers.filter(t => t.role !== 'staff').length, [teachers]);

    const toggleSort = (column: 'name' | 'jp') => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    if (loading || !signatureSettings) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!isPrinting && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Statistik Guru</h1>
                            <p className="text-muted-foreground">
                                Analisis beban mengajar dan tugas tambahan guru.
                            </p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Guru</p>
                                        <p className="text-2xl font-bold">{guruCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-green-100">
                                        <Clock className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total JP Mengajar</p>
                                        <p className="text-2xl font-bold">
                                            {teacherStats.reduce((acc, t) => acc + t.totalJp, 0)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-amber-100">
                                        <BarChart3 className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Rata-rata JP/Guru</p>
                                        <p className="text-2xl font-bold">
                                            {guruCount > 0
                                                ? (teacherStats.reduce((acc, t) => acc + t.totalJp, 0) / guruCount).toFixed(1)
                                                : 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-purple-100">
                                        <BarChart3 className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Rata-rata Grand Total</p>
                                        <p className="text-2xl font-bold">
                                            {guruCount > 0
                                                ? (teacherStats.reduce((acc, t) => acc + t.grandTotal, 0) / guruCount).toFixed(1)
                                                : 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Statistik Beban Mengajar Guru
                                </CardTitle>
                                <CardDescription>
                                    Metode perhitungan: {method === 'byClass' ? 'Per Kelas' : 'Per Sesi'}
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={handlePrint} className="no-print">
                                <Printer className="h-4 w-4 mr-2" />
                                Cetak Statistik
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari guru..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Table */}
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer"
                                                onClick={() => toggleSort('name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Nama Guru
                                                    {sortBy === 'name' && (
                                                        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            {DAYS_OF_WEEK.slice(1, 6).map((day, i) => (
                                                <TableHead key={i} className="text-center">{day.slice(0, 3)}</TableHead>
                                            ))}
                                            <TableHead
                                                className="text-center cursor-pointer whitespace-nowrap"
                                                onClick={() => toggleSort('jp')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Mengajar (JP)
                                                    {sortBy === 'jp' && (
                                                        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap">Tugas Tambahan</TableHead>
                                            <TableHead className="text-center whitespace-nowrap">Beban Tugas</TableHead>
                                            <TableHead className="text-center whitespace-nowrap">Total JP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStats.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                    {searchQuery ? 'Tidak ada hasil yang cocok' : 'Belum ada data guru'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStats.map((teacher, index) => (
                                                <motion.tr
                                                    key={teacher.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="border-b cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setExpandedTeacher(
                                                        expandedTeacher === teacher.id ? null : teacher.id
                                                    )}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {teacher.name}
                                                            {teacher.taskJp > 0 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{teacher.taskJp} tugas
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    {[1, 2, 3, 4, 5].map(day => (
                                                        <TableCell key={day} className="text-center">
                                                            {teacher.byDay[day] > 0 ? (
                                                                <Badge variant="outline">{teacher.byDay[day]}</Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-center">
                                                        <span className="font-mono">{teacher.totalJp}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {teacher.tasks && teacher.tasks.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {teacher.tasks.map((task, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs whitespace-nowrap">
                                                                        {task ? `${task.name} (${task.jp})` : 'Unknown'}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">
                                                        +{teacher.taskJp}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold">
                                                        <Badge variant={teacher.grandTotal > 24 ? "destructive" : teacher.grandTotal >= 20 ? "default" : "secondary"}>
                                                            {teacher.grandTotal} JP
                                                        </Badge>
                                                        {teacher.grandTotal > 24 && (
                                                            <span className="text-xs text-destructive ml-1">+{teacher.grandTotal - 24}</span>
                                                        )}
                                                        {teacher.grandTotal < 20 && (
                                                            <span className="text-xs text-muted-foreground ml-1">-{20 - teacher.grandTotal}</span>
                                                        )}
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Print Section */}
            <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[50]">
                <PrintLayout
                    title="Statistik Beban Mengajar Guru"
                    signatureSettings={signatureSettings}
                    infoLinks={infoLinks}
                    hideQr={true}
                    hideSignatures={true}
                    isMultiPage={true}
                >
                    {/* Executive Summary Cards */}
                    <div className="grid grid-cols-4 gap-3 mb-6 no-print-break">
                        <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                            <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Total Pendidik</span>
                            <div className="text-lg font-black text-slate-900 mt-1 leading-none">{filteredStats.length} Guru</div>
                        </div>
                        <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                            <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Beban KBM</span>
                            <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                                {filteredStats.reduce((acc, t) => acc + t.totalJp, 0)} JP
                            </div>
                        </div>
                        <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                            <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Beban Tugas</span>
                            <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                                {filteredStats.reduce((acc, t) => acc + t.taskJp, 0)} JP
                            </div>
                        </div>
                        <div className="border border-slate-950 p-3 rounded-md bg-slate-100/40 text-center">
                            <span className="text-[7.5px] uppercase tracking-wider text-slate-600 font-bold">Rata-rata Beban</span>
                            <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                                {(filteredStats.reduce((acc, t) => acc + t.grandTotal, 0) / (filteredStats.length || 1)).toFixed(1)} JP
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-950 overflow-hidden rounded-md">
                        <table className="w-full text-[11px] leading-normal print-table border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                                    <th className="border-r border-slate-950 p-2.5 font-bold text-left w-[22%]">Nama Guru</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Sen</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Sel</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Rab</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Kam</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Jum</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[8%] bg-slate-50/50">KBM</th>
                                    <th className="border-r border-slate-950 p-2 font-bold text-center w-[25%]">Tugas Tambahan</th>
                                    <th className="p-2 font-bold text-center w-[15%] bg-slate-50/50">Total JP & Grafik Beban</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((teacher, index) => (
                                    <tr 
                                        key={teacher.id} 
                                        className={`border-b last:border-b-0 border-slate-950 ${
                                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                        }`}
                                    >
                                        <td className="border-r border-slate-950 p-2 align-middle">
                                            <div className="font-bold text-slate-900">{teacher.name}</div>
                                            {teacher.schedules && teacher.schedules.length > 0 ? (
                                                <div className="text-[8px] text-slate-500 mt-1 space-y-0.5 font-medium leading-none">
                                                    <div><span className="font-bold text-slate-700">Mapel:</span> {Array.from(new Set(teacher.schedules.map(s => s.mapel))).join(', ')}</div>
                                                    <div><span className="font-bold text-slate-700">Kelas:</span> {Array.from(new Set(teacher.schedules.flatMap(s => s.classes || []))).join(', ')}</div>
                                                </div>
                                            ) : (
                                                <div className="text-[8px] text-slate-400 mt-1 italic">Tidak ada jadwal KBM</div>
                                            )}
                                        </td>
                                        {[1, 2, 3, 4, 5].map(day => (
                                            <td key={day} className="border-r border-slate-950 p-2 text-center font-mono align-middle text-slate-700">
                                                {teacher.byDay[day] || <span className="text-slate-300">-</span>}
                                            </td>
                                        ))}
                                        <td className="border-r border-slate-950 p-2 text-center font-mono font-bold bg-slate-50/20 align-middle text-slate-800">{teacher.totalJp}</td>
                                        <td className="border-r border-slate-950 p-2 text-[9.5px] leading-tight align-middle">
                                            {teacher.tasks.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {teacher.tasks.map((task, i) => (
                                                        <div key={i} className="flex justify-between items-center gap-2 border-b border-slate-950/5 last:border-0 pb-0.5 last:pb-0">
                                                            <span className="text-slate-600 font-medium text-[9px]">{task?.name}</span>
                                                            <span className="font-bold text-slate-700 text-[9px] bg-slate-100 px-1 py-0.5 rounded leading-none whitespace-nowrap">{task?.jp} JP</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-slate-300 font-semibold">-</div>
                                            )}
                                        </td>
                                        <td className="p-2 align-middle bg-slate-50/20">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-extrabold text-slate-900">{teacher.grandTotal} JP</span>
                                                    <span className="text-[7.5px] font-bold text-slate-500">
                                                        {Math.min(Math.round((teacher.grandTotal / 24) * 100), 100)}% dari 24 JP
                                                    </span>
                                                </div>
                                                {/* Micro visual progress bar */}
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-950/10">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            teacher.grandTotal > 24 
                                                                ? 'bg-rose-500' 
                                                                : teacher.grandTotal >= 20 
                                                                    ? 'bg-emerald-500' 
                                                                    : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${Math.min((teacher.grandTotal / 24) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="text-[7.5px] font-bold mt-0.5">
                                                    {teacher.grandTotal > 24 ? (
                                                        <span className="text-rose-600">Lebih {teacher.grandTotal - 24} JP</span>
                                                    ) : teacher.grandTotal === 24 ? (
                                                        <span className="text-emerald-600">Pas (24 JP)</span>
                                                    ) : (
                                                        <span className="text-amber-600">Kurang {24 - teacher.grandTotal} JP</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </PrintLayout>
            </div>
        </div>
    );
}
