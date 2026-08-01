import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { useTeacherStats } from '@/hooks/useTeacherStats';
import { DAYS_OF_WEEK } from '@/types';

export function TeacherStats() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'jp'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
    const navigate = useNavigate();

    const { teacherStats, filteredStats, guruCount, loading, method } = useTeacherStats(searchQuery, sortBy, sortOrder);

    const toggleSort = (column: 'name' | 'jp') => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handlePrint = () => {
        // Navigate in the SAME tab (not window.open). A freshly opened tab re-initializes
        // Firebase auth + re-checks the admin doc, which is unreliable (known Firebase
        // new-tab bug on iPad/Safari, and fresh-tab getDoc can transiently miss) and caused
        // the cetak statistik page to redirect home. In the same tab the admin status is
        // already verified in memory, so the print page renders deterministically.
        navigate('/cetak/statistik');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                                    <p className="text-sm text-muted-foreground">Rata-rata JP Mengajar</p>
                                    <p className="text-2xl font-bold">
                                        {guruCount > 0
                                            ? (teacherStats.reduce((acc, t) => acc + t.totalJp, 0) / guruCount).toFixed(1)
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
                                                    <Badge variant={teacher.totalJp >= 24 ? "default" : teacher.totalJp >= 16 ? "secondary" : "destructive"}>
                                                        {teacher.totalJp} JP
                                                    </Badge>
                                                    {teacher.totalJp >= 24 ? (
                                                        <div className="text-xs text-emerald-600 mt-1">Memenuhi</div>
                                                    ) : (
                                                        <div className={`text-xs mt-1 font-semibold ${teacher.totalJp < 16 ? 'text-destructive' : 'text-amber-600'}`}>
                                                            Belum memenuhi JP
                                                        </div>
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
        </div>
    );
}
