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

    // Calculate stats for each teacher
    const teacherStats = useMemo(() => {
        return teachers.map(teacher => {
            const teacherSchedules = schedules.filter(s => s.guru === teacher.name);
            const totalJp = calculateTeacherJP(teacher.name, schedules, method);

            // Group by day
            const byDay: Record<number, number> = {};
            for (let day = 1; day <= 6; day++) {
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
                comparison = a.grandTotal - b.grandTotal;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [teacherStats, searchQuery, sortBy, sortOrder]);

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Guru</p>
                                        <p className="text-2xl font-bold">{teachers.length}</p>
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
                                            {teachers.length > 0
                                                ? (teacherStats.reduce((acc, t) => acc + t.grandTotal, 0) / teachers.length).toFixed(1)
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
                                            {DAYS_OF_WEEK.slice(1).map((day, i) => (
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
                                                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                                                    {[1, 2, 3, 4, 5, 6].map(day => (
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
                                                        <Badge variant={teacher.grandTotal > 24 ? "destructive" : "default"}>
                                                            {teacher.grandTotal}
                                                        </Badge>
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
            <div className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white z-[50]">
                <PrintLayout
                    title="Statistik Beban Mengajar Guru"
                    signatureSettings={signatureSettings}
                    infoLinks={infoLinks}
                    hideQr={true}
                    hideSignatures={true}
                >
                    <div className="border border-black">
                        <table className="w-full text-[10px] leading-tight print-table border-collapse">
                            <thead>
                                <tr>
                                    <th className="border border-black p-1 bg-gray-100">Nama Guru</th>
                                    <th className="border border-black p-1 bg-gray-100">Sen</th>
                                    <th className="border border-black p-1 bg-gray-100">Sel</th>
                                    <th className="border border-black p-1 bg-gray-100">Rab</th>
                                    <th className="border border-black p-1 bg-gray-100">Kam</th>
                                    <th className="border border-black p-1 bg-gray-100">Jum</th>
                                    <th className="border border-black p-1 bg-gray-100">Sab</th>
                                    <th className="border border-black p-1 bg-gray-100">JP Ngajar</th>
                                    <th className="border border-black p-1 bg-gray-100">Tugas</th>
                                    <th className="border border-black p-1 bg-gray-100">Total JP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.map((teacher) => (
                                    <tr key={teacher.id}>
                                        <td className="border border-black p-1 font-medium">{teacher.name}</td>
                                        {[1, 2, 3, 4, 5, 6].map(day => (
                                            <td key={day} className="border border-black p-1 text-center font-mono">
                                                {teacher.byDay[day] || '-'}
                                            </td>
                                        ))}
                                        <td className="border border-black p-1 text-center font-mono">{teacher.totalJp}</td>
                                        <td className="border border-black p-1 text-[8px] leading-tight min-w-[120px]">
                                            {teacher.tasks.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {teacher.tasks.map((task, i) => (
                                                        <div key={i} className="flex justify-between gap-2 border-b border-black/5 last:border-0">
                                                            <span>• {task?.name}</span>
                                                            <span className="font-bold whitespace-nowrap">{task?.jp} JP</span>
                                                        </div>
                                                    ))}
                                                    <div className="text-right font-bold mt-1 border-t border-black/10 pt-0.5">
                                                        Sub: {teacher.taskJp} JP
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400">-</div>
                                            )}
                                        </td>
                                        <td className="border border-black p-1 text-center font-bold font-mono">{teacher.grandTotal}</td>
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
