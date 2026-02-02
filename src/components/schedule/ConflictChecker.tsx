import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle,
    User,
    GraduationCap,
    Search,
    Loader2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useSchedules, useTeachers, useTimeSlots } from '@/hooks/useFirebase';
import { findScheduleConflicts, getDayName } from '@/lib/scheduleUtils';

export function ConflictChecker() {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { teachers } = useTeachers();
    const { timeSlots } = useTimeSlots();

    const [filterType, setFilterType] = useState<'all' | 'teacher' | 'class'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacherA, setSelectedTeacherA] = useState('');
    const [selectedTeacherB, setSelectedTeacherB] = useState('');

    const loading = schedulesLoading;

    // Find all conflicts
    const conflicts = useMemo(() => {
        return findScheduleConflicts(schedules);
    }, [schedules]);

    // Filter conflicts
    const filteredConflicts = useMemo(() => {
        let result = conflicts;

        if (filterType !== 'all') {
            result = result.filter(c => c.type === filterType);
        }

        if (searchQuery) {
            result = result.filter(c =>
                c.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.schedules.some(s =>
                    s.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.guru.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        return result;
    }, [conflicts, filterType, searchQuery]);

    // Teacher comparison
    const teacherComparison = useMemo(() => {
        if (!selectedTeacherA || !selectedTeacherB) return null;

        const schedulesA = schedules.filter(s => s.guru === selectedTeacherA);
        const schedulesB = schedules.filter(s => s.guru === selectedTeacherB);

        // Find overlapping time slots
        const overlaps = schedulesA.filter(a =>
            schedulesB.some(b => b.day === a.day && b.jp === a.jp)
        );

        return {
            teacherA: { name: selectedTeacherA, schedules: schedulesA },
            teacherB: { name: selectedTeacherB, schedules: schedulesB },
            overlaps
        };
    }, [selectedTeacherA, selectedTeacherB, schedules]);

    const getSlotLabel = (jp: number) => {
        const slot = timeSlots.find(s => s.jp === jp);
        return slot ? `JP ${jp} (${slot.startTime} - ${slot.endTime})` : `JP ${jp}`;
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
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${conflicts.length === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                {conflicts.length === 0 ? (
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Konflik</p>
                                <p className="text-2xl font-bold">{conflicts.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100">
                                <User className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Konflik Guru</p>
                                <p className="text-2xl font-bold">
                                    {conflicts.filter(c => c.type === 'teacher').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100">
                                <GraduationCap className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Konflik Kelas</p>
                                <p className="text-2xl font-bold">
                                    {conflicts.filter(c => c.type === 'class').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="conflicts">
                <TabsList>
                    <TabsTrigger value="conflicts">Daftar Konflik</TabsTrigger>
                    <TabsTrigger value="compare">Bandingkan Guru</TabsTrigger>
                </TabsList>

                <TabsContent value="conflicts" className="space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex gap-2">
                                    <Button
                                        variant={filterType === 'all' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterType('all')}
                                    >
                                        Semua
                                    </Button>
                                    <Button
                                        variant={filterType === 'teacher' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterType('teacher')}
                                    >
                                        <User className="h-4 w-4 mr-1" />
                                        Guru
                                    </Button>
                                    <Button
                                        variant={filterType === 'class' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterType('class')}
                                    >
                                        <GraduationCap className="h-4 w-4 mr-1" />
                                        Kelas
                                    </Button>
                                </div>
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari konflik..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Conflict List */}
                    {filteredConflicts.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                                <h3 className="text-lg font-semibold text-green-600">
                                    {conflicts.length === 0
                                        ? 'Tidak Ada Konflik!'
                                        : 'Tidak ada konflik yang cocok dengan filter'}
                                </h3>
                                <p className="text-muted-foreground mt-2">
                                    {conflicts.length === 0
                                        ? 'Jadwal Anda sudah konsisten tanpa tumpang tindih.'
                                        : 'Coba ubah filter atau kata kunci pencarian.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredConflicts.map((conflict, index) => (
                                <motion.div
                                    key={`${conflict.day}-${conflict.jp}-${conflict.entity}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="border-red-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                                {conflict.type === 'teacher' ? 'Konflik Guru' : 'Konflik Kelas'}:
                                                <Badge variant="destructive">{conflict.entity}</Badge>
                                            </CardTitle>
                                            <CardDescription>
                                                {getDayName(conflict.day)}, {getSlotLabel(conflict.jp)}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {conflict.schedules.map((schedule, i) => (
                                                    <div
                                                        key={schedule.id}
                                                        className="flex items-center gap-4 p-2 bg-muted rounded-md"
                                                    >
                                                        <Badge variant="outline">{i + 1}</Badge>
                                                        <div>
                                                            <span className="font-medium">{schedule.mapel}</span>
                                                            <span className="text-muted-foreground mx-2">—</span>
                                                            <span>{schedule.guru}</span>
                                                            {schedule.classes?.length > 0 && (
                                                                <span className="text-muted-foreground ml-2">
                                                                    ({schedule.classes.join(', ')})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="compare">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bandingkan Jadwal Dua Guru</CardTitle>
                            <CardDescription>
                                Pilih dua guru untuk melihat jadwal yang tumpang tindih
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Guru 1</label>
                                    <select
                                        className="w-full p-2 border rounded-md"
                                        value={selectedTeacherA}
                                        onChange={(e) => setSelectedTeacherA(e.target.value)}
                                    >
                                        <option value="">Pilih guru...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Guru 2</label>
                                    <select
                                        className="w-full p-2 border rounded-md"
                                        value={selectedTeacherB}
                                        onChange={(e) => setSelectedTeacherB(e.target.value)}
                                    >
                                        <option value="">Pilih guru...</option>
                                        {teachers.filter(t => t.name !== selectedTeacherA).map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {teacherComparison && (
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-lg ${teacherComparison.overlaps.length === 0 ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            {teacherComparison.overlaps.length === 0 ? (
                                                <>
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                    <span className="text-green-700 font-medium">
                                                        Tidak ada jadwal yang tumpang tindih
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                                    <span className="text-red-700 font-medium">
                                                        {teacherComparison.overlaps.length} jadwal tumpang tindih
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {teacherComparison.overlaps.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Detail Tumpang Tindih:</h4>
                                            {teacherComparison.overlaps.map(schedule => (
                                                <div key={schedule.id} className="p-3 bg-muted rounded-md">
                                                    <div className="font-medium">
                                                        {getDayName(schedule.day)}, {getSlotLabel(schedule.jp)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {schedule.mapel} — {schedule.classes?.join(', ')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
