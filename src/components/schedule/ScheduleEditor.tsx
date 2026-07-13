import { useState, useMemo } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    User,
    BookOpen,
    Loader2,
    Save,
    Search,
    Check,
    ChevronsUpDown,
    Upload,
    Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { cn } from '@/lib/utils';

import { useSchedules, useTeachers, useClasses, useSubjects, useTimeSlots } from '@/hooks/useFirebase';
import { getDayName, getLessonTimeSlots } from '@/lib/scheduleUtils';
import { DAYS_OF_WEEK, Schedule } from '@/types';

export function ScheduleEditor() {
    const { schedules, loading, addSchedule, updateSchedule, deleteSchedule, bulkDeleteSchedules, bulkAddSchedules } = useSchedules();
    const { teachers } = useTeachers();
    const { classes } = useClasses();
    const { subjects } = useSubjects();
    const { timeSlots } = useTimeSlots();

    const [selectedDay, setSelectedDay] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');

    // Form state
    const [formDays, setFormDays] = useState<number[]>([1]);
    const [isMultiJp, setIsMultiJp] = useState(false);
    const [formStartJp, setFormStartJp] = useState<number>(1);
    const [formEndJp, setFormEndJp] = useState<number>(1);
    const [formJp, setFormJp] = useState<number>(1); // Fallback for single JP edit/view
    const [formMapel, setFormMapel] = useState('');
    const [formGuru, setFormGuru] = useState('');
    const [formClasses, setFormClasses] = useState<string[]>([]);

    // Combobox states
    const [mapelOpen, setMapelOpen] = useState(false);
    const [guruOpen, setGuruOpen] = useState(false);
    const [mapelSearch, setMapelSearch] = useState('');
    const [guruSearch, setGuruSearch] = useState('');

    // Import states
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [previewRows, setPreviewRows] = useState<{
        mapel: string;
        guru: string;
        hari: string;
        jp: string;
        kelas: string;
        status: 'valid' | 'error' | 'skip' | 'conflict';
        error: string;
        conflicts: string[];
    }[]>([]);

    const lessonSlots = useMemo(() => {
        const isSaturdaySelected = formDays.includes(6);
        if (isSaturdaySelected) {
            return getLessonTimeSlots(timeSlots).filter(slot => slot.dayType === 'saturday');
        }
        return getLessonTimeSlots(timeSlots).filter(slot => slot.dayType !== 'saturday');
    }, [timeSlots, formDays]);

    const previewTargetJps = useMemo(() => {
        if (!isMultiJp) return [formJp];
        const start = Math.min(formStartJp, formEndJp);
        const end = Math.max(formStartJp, formEndJp);
        const jps: number[] = [];
        for (let i = start; i <= end; i++) {
            if (lessonSlots.some(slot => slot.jp === i)) {
                jps.push(i);
            }
        }
        return jps;
    }, [isMultiJp, formStartJp, formEndJp, formJp, lessonSlots]);

    const DAY_NAME_TO_NUMBER: Record<string, number> = {
        senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
    };

    const downloadTemplate = () => {
        const template = subjects.map(s => ({
            mapel: s.name,
            guru: s.guru || "",
            hari: "",
            jp: [],
            kelas: []
        }));
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template-jadwal.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    type PreviewRow = {
        mapel: string;
        guru: string;
        hari: string;
        jp: string;
        kelas: string;
        status: 'valid' | 'error' | 'skip' | 'conflict';
        error: string;
        conflicts: string[];
    };

    const parseJpValue = (jp: any): number[] => {
        if (Array.isArray(jp)) return jp.map(Number).filter(n => n > 0);
        if (typeof jp === 'string' && jp) return jp.split(',').map(s => Number(s.trim())).filter(n => n > 0);
        if (typeof jp === 'number' && jp > 0) return [jp];
        return [];
    };

    const validatePreviewRow = (row: PreviewRow): PreviewRow => {
        if (!row.mapel && !row.hari && !row.jp && !row.kelas) {
            return { ...row, status: 'skip', error: '', conflicts: [] };
        }

        const classNames = new Set(classes.map(c => c.name));
        const validLessonJps = new Set(lessonSlots.map(s => s.jp));
        const subjectNames = new Set(subjects.map(s => s.name.toLowerCase()));

        if (!row.mapel) return { ...row, status: 'error', error: 'mapel kosong', conflicts: [] };
        if (!subjectNames.has(row.mapel.toLowerCase())) {
            return { ...row, status: 'error', error: `mapel "${row.mapel}" tidak ada di database`, conflicts: [] };
        }
        if (!row.guru) return { ...row, status: 'error', error: 'guru kosong', conflicts: [] };
        if (!row.hari) return { ...row, status: 'error', error: 'hari kosong', conflicts: [] };
        if (!DAY_NAME_TO_NUMBER[row.hari.toLowerCase()]) {
            return { ...row, status: 'error', error: `hari "${row.hari}" tidak valid`, conflicts: [] };
        }
        if (!row.jp) return { ...row, status: 'error', error: 'JP kosong', conflicts: [] };

        const jpNums = parseJpValue(row.jp);
        if (jpNums.length === 0) return { ...row, status: 'error', error: 'JP kosong', conflicts: [] };
        const invalidJps = jpNums.filter(jp => !validLessonJps.has(jp));
        if (invalidJps.length > 0) {
            return { ...row, status: 'error', error: `JP ${invalidJps.join(', ')} tidak tersedia`, conflicts: [] };
        }

        if (!row.kelas) return { ...row, status: 'error', error: 'kelas kosong', conflicts: [] };
        const kelasArr = row.kelas.split(',').map(s => s.trim()).filter(Boolean);
        if (kelasArr.length === 0) return { ...row, status: 'error', error: 'kelas kosong', conflicts: [] };
        const invalidKelas = kelasArr.filter(c => !classNames.has(c));
        if (invalidKelas.length > 0) {
            return { ...row, status: 'error', error: `kelas "${invalidKelas.join('", "')}" tidak ada di database`, conflicts: [] };
        }

        return { ...row, status: 'valid', error: '', conflicts: [] };
    };

    const handleParseJson = () => {
        try {
            const parsed = JSON.parse(importJson);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                setPreviewRows([{ mapel: '', guru: '', hari: '', jp: '', kelas: '', status: 'error', error: 'JSON kosong atau bukan array', conflicts: [] }]);
                return;
            }
            const rows: PreviewRow[] = parsed.map((row: any) => {
                const kelas = Array.isArray(row.kelas) ? row.kelas.join(', ') : String(row.kelas || '');
                const jp = Array.isArray(row.jp) ? row.jp.join(', ') : row.jp !== undefined ? String(row.jp) : '';
                return {
                    mapel: String(row.mapel || ''),
                    guru: String(row.guru || ''),
                    hari: row.hari !== undefined ? String(row.hari) : '',
                    jp,
                    kelas,
                    status: 'skip' as const,
                    error: '',
                    conflicts: [],
                };
            });
            setPreviewRows(rows.map(validatePreviewRow));
            setTimeout(() => checkImportConflicts(), 0);
        } catch {
            setPreviewRows([{ mapel: '', guru: '', hari: '', jp: '', kelas: '', status: 'error', error: 'Format JSON tidak valid', conflicts: [] }]);
        }
    };

    const checkImportConflicts = () => {
        setPreviewRows(prev => {
            const DAY_TO_NUM: Record<string, number> = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };

            // Build expanded entries from all valid rows
            const expandedEntries: { rowIndex: number; day: number; jp: number; guru: string; kelas: string; mapel: string }[] = [];
            for (let i = 0; i < prev.length; i++) {
                const r = prev[i];
                if (r.status !== 'valid') continue;
                const jpNums = parseJpValue(r.jp);
                const kelasArr = r.kelas.split(',').map(s => s.trim()).filter(Boolean);
                for (const jp of jpNums) {
                    for (const kelas of kelasArr) {
                        expandedEntries.push({ rowIndex: i, day: DAY_TO_NUM[r.hari.toLowerCase()], jp, guru: r.guru, kelas, mapel: r.mapel });
                    }
                }
            }

            // Check against existing schedules
            const existingConflicts = new Map<number, string[]>();
            for (const entry of expandedEntries) {
                const conflictsWithExisting = schedules.filter(s =>
                    Number(s.day) === entry.day && Number(s.jp) === entry.jp && (
                        s.guru === entry.guru ||
                        s.classes?.includes(entry.kelas)
                    )
                );
                for (const c of conflictsWithExisting) {
                    const msgs = existingConflicts.get(entry.rowIndex) || [];
                    if (c.guru === entry.guru) {
                        msgs.push(`Guru "${entry.guru}" bentrok JP ${entry.jp} ${getDayName(entry.day)} (${c.mapel})`);
                    }
                    if (c.classes?.includes(entry.kelas)) {
                        msgs.push(`Kelas "${entry.kelas}" bentrok JP ${entry.jp} ${getDayName(entry.day)} (${c.mapel} - ${c.guru})`);
                    }
                    existingConflicts.set(entry.rowIndex, msgs);
                }
            }

            // Check within import batch (same guru or same class at same day+jp)
            const batchConflicts = new Map<number, string[]>();
            const groupedByDayJp = new Map<string, typeof expandedEntries>();
            for (const entry of expandedEntries) {
                const key = `${entry.day}-${entry.jp}`;
                if (!groupedByDayJp.has(key)) groupedByDayJp.set(key, []);
                groupedByDayJp.get(key)!.push(entry);
            }

            groupedByDayJp.forEach((entries) => {
                // Check guru conflicts within batch
                const guruGroups = new Map<string, typeof entries>();
                for (const e of entries) {
                    if (!guruGroups.has(e.guru)) guruGroups.set(e.guru, []);
                    guruGroups.get(e.guru)!.push(e);
                }
                guruGroups.forEach((group) => {
                    if (group.length > 1) {
                        const day = group[0].day;
                        const jp = group[0].jp;
                        for (const e of group) {
                            const msgs = batchConflicts.get(e.rowIndex) || [];
                            const otherKelas = group.filter(x => x !== e).map(x => x.kelas).join(', ');
                            msgs.push(`Guru "${e.guru}" diimport ke kelas ${e.kelas} & ${otherKelas} di JP ${jp} ${getDayName(day)} (satu guru, beberapa kelas)`);
                            batchConflicts.set(e.rowIndex, msgs);
                        }
                    }
                });

                // Check class conflicts within batch
                const classGroups = new Map<string, typeof entries>();
                for (const e of entries) {
                    if (!classGroups.has(e.kelas)) classGroups.set(e.kelas, []);
                    classGroups.get(e.kelas)!.push(e);
                }
                classGroups.forEach((group) => {
                    if (group.length > 1) {
                        const day = group[0].day;
                        const jp = group[0].jp;
                        for (const e of group) {
                            const msgs = batchConflicts.get(e.rowIndex) || [];
                            const otherMapel = group.filter(x => x !== e).map(x => x.mapel).join(', ');
                            msgs.push(`Kelas "${e.kelas}" diimport mapel ${e.mapel} & ${otherMapel} di JP ${jp} ${getDayName(day)}`);
                            batchConflicts.set(e.rowIndex, msgs);
                        }
                    }
                });
            });

            // Merge and apply
            return prev.map((row, i) => {
                if (row.status === 'error' || row.status === 'skip') return row;
                const allConflicts = [
                    ...(existingConflicts.get(i) || []),
                    ...(batchConflicts.get(i) || []),
                ];
                // Deduplicate
                const unique = [...new Set(allConflicts)];
                if (unique.length > 0) {
                    return { ...row, status: 'conflict' as const, conflicts: unique };
                }
                return { ...row, status: 'valid' as const, conflicts: [] };
            });
        });
    };

    const updatePreviewRow = (index: number, field: keyof PreviewRow, value: string) => {
        setPreviewRows(prev => {
            const next = [...prev];
            next[index] = validatePreviewRow({ ...next[index], [field]: value });
            return next;
        });
        setTimeout(() => checkImportConflicts(), 0);
    };

    const removePreviewRow = (index: number) => {
        setPreviewRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleImportFromPreview = async () => {
        const DAY_TO_NUM: Record<string, number> = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };

        const items: Omit<Schedule, 'id'>[] = [];
        let skipped = 0;
        for (const r of previewRows.filter(r => r.status === 'valid' || r.status === 'conflict')) {
            const jpNums = parseJpValue(r.jp);
            const kelasArr = r.kelas.split(',').map(s => s.trim()).filter(Boolean);
            for (const jp of jpNums) {
                for (const kelas of kelasArr) {
                    const alreadyExists = schedules.some(s =>
                        Number(s.day) === DAY_TO_NUM[r.hari.toLowerCase()] &&
                        Number(s.jp) === jp &&
                        s.mapel === r.mapel &&
                        s.guru === r.guru &&
                        s.classes?.includes(kelas)
                    );
                    if (alreadyExists) {
                        skipped++;
                        continue;
                    }
                    items.push({
                        day: DAY_TO_NUM[r.hari.toLowerCase()],
                        jp,
                        mapel: r.mapel,
                        guru: r.guru,
                        classes: [kelas],
                    });
                }
            }
        }

        if (items.length === 0) {
            if (skipped > 0) {
                alert(`${skipped} jadwal dilewati karena sudah ada di database.`);
            }
            return;
        }

        setIsImporting(true);
        try {
            await bulkAddSchedules(items);
            setIsImportDialogOpen(false);
            setPreviewRows([]);
            setImportJson('');
        } finally {
            setIsImporting(false);
        }
    };

    const resetForm = () => {
        setFormDays([selectedDay]);
        setIsMultiJp(false);
        setFormStartJp(1);
        setFormEndJp(1);
        setFormJp(1);
        setFormMapel('');
        setFormGuru('');
        setFormClasses([]);
        setEditingSchedule(null);
        setMapelSearch('');
        setGuruSearch('');
    };

    const openAddDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setFormDays([schedule.day]);
        setIsMultiJp(false);
        setFormJp(schedule.jp);
        setFormStartJp(schedule.jp);
        setFormEndJp(schedule.jp);
        setFormMapel(schedule.mapel);
        setFormGuru(schedule.guru);
        setFormClasses(schedule.classes || []);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        const guruValue = formGuru || selectedSubjectGuru;
        if (!formMapel || !guruValue || formClasses.length === 0) {
            return;
        }

        if (editingSchedule) {
            await updateSchedule(editingSchedule.id, {
                day: formDays[0],
                jp: formJp,
                mapel: formMapel,
                guru: guruValue,
                classes: formClasses
            });
        } else {
            // Calculate target JPs
            let targetJps: number[] = [];
            if (isMultiJp) {
                const start = Math.min(formStartJp, formEndJp);
                const end = Math.max(formStartJp, formEndJp);
                for (let i = start; i <= end; i++) {
                    // Only include valid lesson slots
                    if (lessonSlots.some(slot => slot.jp === i)) {
                        targetJps.push(i);
                    }
                }
            } else {
                targetJps = [formJp];
            }

            // Create schedule for each day and each JP, skip duplicates
            let skipped = 0;
            for (const day of formDays) {
                for (const jp of targetJps) {
                    const alreadyExists = schedules.some(s =>
                        Number(s.day) === day &&
                        Number(s.jp) === jp &&
                        s.mapel === formMapel &&
                        s.guru === guruValue &&
                        formClasses.some(c => s.classes?.includes(c))
                    );
                    if (alreadyExists) {
                        skipped++;
                        continue;
                    }
                    await addSchedule({
                        day,
                        jp,
                        mapel: formMapel,
                        guru: guruValue,
                        classes: formClasses
                    });
                }
            }
            if (skipped > 0) {
                console.warn(`${skipped} jadwal dilewati karena sudah ada.`);
            }
        }

        setIsDialogOpen(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        await deleteSchedule(id);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await bulkDeleteSchedules(selectedIds);
            setSelectedIds([]);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleClearDay = async () => {
        const todayIds = schedules
            .filter(s => Number(s.day) === selectedDay)
            .map(s => s.id);

        if (todayIds.length === 0) return;

        setIsBulkDeleting(true);
        try {
            await bulkDeleteSchedules(todayIds);
            setSelectedIds([]);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const toggleDaySelection = (day: number) => {
        setFormDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const toggleClassSelection = (className: string) => {
        setFormClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const toggleScheduleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleAllOnDay = () => {
        const todayIds = filteredSchedules.map(s => s.id);

        if (selectedIds.length === todayIds.length && todayIds.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(todayIds);
        }
    };

    // Get schedules for the selected day
    const daySchedules = useMemo(() => {
        return schedules
            .filter(s => Number(s.day) === selectedDay)
            .sort((a, b) => {
                if (Number(a.jp) !== Number(b.jp)) return Number(a.jp) - Number(b.jp);
                return a.mapel.localeCompare(b.mapel);
            });
    }, [schedules, selectedDay]);

    const filteredSchedules = useMemo(() => {
        if (!filterQuery) return daySchedules;
        return daySchedules.filter(s =>
            s.mapel.toLowerCase().includes(filterQuery.toLowerCase()) ||
            s.guru.toLowerCase().includes(filterQuery.toLowerCase()) ||
            s.classes?.some(c => c.toLowerCase().includes(filterQuery.toLowerCase()))
        );
    }, [daySchedules, filterQuery]);


    const filteredMapel = useMemo(() => {
        if (!mapelSearch) return subjects;
        return subjects.filter(s => s.name.toLowerCase().includes(mapelSearch.toLowerCase()));
    }, [subjects, mapelSearch]);

    const filteredGuru = useMemo(() => {
        if (!guruSearch) return teachers;
        return teachers.filter(t => t.name.toLowerCase().includes(guruSearch.toLowerCase()));
    }, [teachers, guruSearch]);

    const selectedSubjectGuru = useMemo(() => {
        if (!formMapel) return '';
        const subject = subjects.find(s => s.name === formMapel);
        return subject?.guru || '';
    }, [formMapel, subjects]);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-2xl font-bold">Kelola Jadwal</h2>
                    <div className="flex items-center gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openAddDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Jadwal
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingSchedule
                                            ? 'Ubah detail jadwal yang dipilih'
                                            : 'Isi form di bawah untuk menambahkan jadwal baru'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6 py-4">
                                    {/* Day Selection */}
                                    <div className="space-y-2">
                                        <Label>Hari {!editingSchedule && '(bisa lebih dari satu)'}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.slice(1).map((day, index) => (
                                                <Badge
                                                    key={index + 1}
                                                    variant={formDays.includes(index + 1) ? 'default' : 'outline'}
                                                    className="cursor-pointer"
                                                    onClick={() => !editingSchedule && toggleDaySelection(index + 1)}
                                                >
                                                    {day}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* JP Selection */}
                                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                                        <div className="flex items-center justify-between">
                                            <Label>Jam Pelajaran (JP)</Label>
                                            {!editingSchedule && (
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="multi-jp-mode"
                                                        checked={isMultiJp}
                                                        onCheckedChange={(checked) => {
                                                            setIsMultiJp(checked);
                                                            if (checked) {
                                                                setFormStartJp(formJp);
                                                                setFormEndJp(formJp);
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor="multi-jp-mode" className="text-xs font-normal text-muted-foreground">
                                                        Mode Rentang (Multi-JP)
                                                    </Label>
                                                </div>
                                            )}
                                        </div>

                                        {isMultiJp && !editingSchedule ? (
                                            <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Dari JP</Label>
                                                    <Select value={String(formStartJp)} onValueChange={(v) => setFormStartJp(Number(v))}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lessonSlots.map((slot) => (
                                                                <SelectItem key={slot.jp} value={String(slot.jp)}>
                                                                    JP {slot.jp} ({slot.startTime})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Sampai JP</Label>
                                                    <Select value={String(formEndJp)} onValueChange={(v) => setFormEndJp(Number(v))}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lessonSlots.map((slot) => (
                                                                <SelectItem key={slot.jp} value={String(slot.jp)}>
                                                                    JP {slot.jp} (-{slot.endTime})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {previewTargetJps.length > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Akan membuat: {previewTargetJps.map(jp => `JP ${jp}`).join(', ')} ({previewTargetJps.length} JP)
                                                </p>
                                            )}
                                            </>
                                        ) : (
                                            <Select value={String(formJp)} onValueChange={(v) => setFormJp(Number(v))}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {lessonSlots.map((slot) => (
                                                        <SelectItem key={slot.jp} value={String(slot.jp)}>
                                                            JP {slot.jp} ({slot.startTime} - {slot.endTime})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* Subject Selection (Combobox) */}
                                    <div className="space-y-2">
                                        <Label>Mata Pelajaran</Label>
                                        <Popover open={mapelOpen} onOpenChange={setMapelOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between font-normal"
                                                >
                                                    {formMapel ? formMapel : "Pilih mata pelajaran..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <div className="flex items-center border-b px-3">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                    <input
                                                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="Cari mapel..."
                                                        value={mapelSearch}
                                                        onChange={(e) => setMapelSearch(e.target.value)}
                                                    />
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto p-1">
                                                    {filteredMapel.length === 0 ? (
                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                            Tidak ditemukan.
                                                        </div>
                                                    ) : (
                                                        filteredMapel.map((subject) => (
                                                            <div
                                                                key={subject.id}
                                                                className={cn(
                                                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                                    formMapel === subject.name ? "bg-accent text-accent-foreground" : ""
                                                                )}
                                                                onClick={() => {
                                                                    setFormMapel(subject.name);
                                                                    if (subject.guru) {
                                                                        setFormGuru(subject.guru);
                                                                    }
                                                                    setMapelOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formMapel === subject.name ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {subject.name}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Teacher Selection (Combobox or Auto-filled) */}
                                    <div className="space-y-2">
                                        <Label>Guru</Label>
                                        {selectedSubjectGuru ? (
                                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                                {selectedSubjectGuru}
                                            </div>
                                        ) : (
                                            <Popover open={guruOpen} onOpenChange={setGuruOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className="w-full justify-between font-normal"
                                                    >
                                                        {formGuru ? formGuru : "Pilih guru..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <div className="flex items-center border-b px-3">
                                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <input
                                                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                            placeholder="Cari guru..."
                                                            value={guruSearch}
                                                            onChange={(e) => setGuruSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="max-h-[200px] overflow-y-auto p-1">
                                                        {filteredGuru.length === 0 ? (
                                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                                Tidak ditemukan.
                                                            </div>
                                                        ) : (
                                                            filteredGuru.map((teacher) => (
                                                                <div
                                                                    key={teacher.id}
                                                                    className={cn(
                                                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                                        formGuru === teacher.name ? "bg-accent text-accent-foreground" : ""
                                                                    )}
                                                                    onClick={() => {
                                                                        setFormGuru(teacher.name);
                                                                        setGuruOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formGuru === teacher.name ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {teacher.name}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>

                                    {/* Class Selection (Multi-select) */}
                                    <div className="space-y-2">
                                        <Label>Kelas (bisa lebih dari satu)</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                                            {classes.map((cls) => (
                                                <div
                                                    key={cls.id}
                                                    className="flex items-center space-x-2"
                                                >
                                                    <Checkbox
                                                        id={`class-${cls.id}`}
                                                        checked={formClasses.includes(cls.name)}
                                                        onCheckedChange={() => toggleClassSelection(cls.name)}
                                                    />
                                                    <label
                                                        htmlFor={`class-${cls.id}`}
                                                        className="text-sm cursor-pointer"
                                                    >
                                                        {cls.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {formClasses.length > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                Dipilih: {formClasses.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!formMapel || (!formGuru && !selectedSubjectGuru) || formClasses.length === 0}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {editingSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
                            setIsImportDialogOpen(open);
                            if (!open) { setPreviewRows([]); setImportJson(''); }
                        }}>
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                                <Upload className="h-4 w-4 mr-2" />
                                Import JSON
                            </Button>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Import Jadwal dari JSON</DialogTitle>
                                    <DialogDescription>
                                        Download template, isi data, lalu validasi sebelum import.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    {previewRows.length === 0 ? (
                                        <>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download Template
                                                </Button>
                                                <label>
                                                    <input
                                                        type="file"
                                                        accept=".json"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                setImportJson(ev.target?.result as string);
                                                            };
                                                            reader.readAsText(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <Button variant="outline" size="sm" asChild>
                                                        <span>
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Upload File
                                                        </span>
                                                    </Button>
                                                </label>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>JSON Data</Label>
                                                <textarea
                                                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono"
                                                    placeholder='[{"mapel":"Matematika","guru":"Pak Budi","hari":"Senin","jp":[1,2],"kelas":["7A","7B"]}]'
                                                    value={importJson}
                                                    onChange={(e) => setImportJson(e.target.value)}
                                                />
                                            </div>

                                            <Button onClick={handleParseJson} disabled={!importJson.trim()} className="w-full">
                                                <Search className="h-4 w-4 mr-2" />
                                                Validasi
                                            </Button>

                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <p><strong>Cara pakai:</strong></p>
                                                <ol className="list-decimal list-inside space-y-0.5">
                                                    <li>Download template → edit: isi <code>hari</code>, <code>jp</code>, <code>kelas</code></li>
                                                    <li>Biarkan kosong jika mapel tidak ada jadwal</li>
                                                    <li>Paste/upload → klik <strong>Validasi</strong> untuk preview</li>
                                                    <li>Fix error langsung di tabel, lalu klik <strong>Import</strong></li>
                                                </ol>
                                                <p className="mt-2"><strong>Guru otomatis</strong> dari data mapel di /data</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                                    <Badge variant="default">{previewRows.filter(r => r.status === 'valid').length} valid</Badge>
                                                    <Badge variant="destructive">{previewRows.filter(r => r.status === 'error').length} error</Badge>
                                                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">{previewRows.filter(r => r.status === 'conflict').length} konflik</Badge>
                                                    <Badge variant="outline">{previewRows.filter(r => r.status === 'skip').length} dilewati</Badge>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => { setPreviewRows([]); setImportJson(''); }}>
                                                    Kembali
                                                </Button>
                                            </div>

                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="max-h-[400px] overflow-y-auto">
                                                    <Table>
                                                        <TableHeader className="sticky top-0 bg-background z-10">
                                                            <TableRow className="bg-muted/50">
                                                                <TableHead className="w-[30px]">#</TableHead>
                                                                <TableHead>Mapel</TableHead>
                                                                <TableHead>Guru</TableHead>
                                                                <TableHead className="w-[100px]">Hari</TableHead>
                                                                <TableHead className="w-[70px]">JP</TableHead>
                                                                <TableHead>Kelas</TableHead>
                                                                <TableHead className="w-[150px]">Status</TableHead>
                                                                <TableHead className="w-[40px]"></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {previewRows.map((row, i) => (
                                                                <TableRow
                                                                    key={i}
                                                                    className={cn(
                                                                        row.status === 'error' && 'bg-destructive/5',
                                                                        row.status === 'conflict' && 'bg-yellow-50 dark:bg-yellow-950/20',
                                                                        row.status === 'skip' && 'opacity-50'
                                                                    )}
                                                                >
                                                                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                                                    <TableCell className="text-sm font-medium">{row.mapel}</TableCell>
                                                                    <TableCell>
                                                                        {row.status === 'error' || row.status === 'valid' ? (
                                                                            <Input
                                                                                value={row.guru}
                                                                                onChange={(e) => updatePreviewRow(i, 'guru', e.target.value)}
                                                                                className="h-7 text-xs"
                                                                                placeholder="Nama guru"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">{row.guru || '-'}</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.status === 'error' || row.status === 'valid' ? (
                                                                            <Input
                                                                                value={row.hari}
                                                                                onChange={(e) => updatePreviewRow(i, 'hari', e.target.value)}
                                                                                className="h-7 text-xs"
                                                                                placeholder="Senin"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs">{row.hari}</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.status === 'error' || row.status === 'valid' ? (
                                                                            <Input
                                                                                value={row.jp}
                                                                                onChange={(e) => updatePreviewRow(i, 'jp', e.target.value)}
                                                                                className="h-7 text-xs"
                                                                                placeholder="1, 2, 3"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs">{row.jp}</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.status === 'error' || row.status === 'valid' ? (
                                                                            <Input
                                                                                value={row.kelas}
                                                                                onChange={(e) => updatePreviewRow(i, 'kelas', e.target.value)}
                                                                                className="h-7 text-xs"
                                                                                placeholder="7A, 7B"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs">{row.kelas}</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.status === 'error' ? (
                                                                            <span className="text-xs text-destructive">{row.error}</span>
                                                                        ) : row.status === 'conflict' ? (
                                                                            <div className="space-y-0.5">
                                                                                <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">Konflik</Badge>
                                                                                {row.conflicts.map((c, ci) => (
                                                                                    <p key={ci} className="text-[10px] text-yellow-600 leading-tight">{c}</p>
                                                                                ))}
                                                                            </div>
                                                                        ) : row.status === 'valid' ? (
                                                                            <Badge variant="default" className="text-[10px]">Siap import</Badge>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">Dilewati</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={() => removePreviewRow(i)}
                                                                        >
                                                                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setPreviewRows([]); setImportJson(''); }}>
                                        Batal
                                    </Button>
                                    {previewRows.length > 0 && (() => {
                                        const importableCount = previewRows.filter(r => r.status === 'valid' || r.status === 'conflict').length;
                                        const totalEntries = previewRows.filter(r => r.status === 'valid' || r.status === 'conflict').reduce((sum, r) => {
                                            const jpCount = parseJpValue(r.jp).length;
                                            const kelasCount = r.kelas.split(',').map(s => s.trim()).filter(Boolean).length;
                                            return sum + jpCount * kelasCount;
                                        }, 0);
                                        return (
                                            <Button
                                                onClick={handleImportFromPreview}
                                                disabled={importableCount === 0 || isImporting}
                                            >
                                                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                                Import {totalEntries} Jadwal ({importableCount} baris)
                                            </Button>
                                        );
                                    })()}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1 bg-muted/20 rounded-lg">
                    <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))} className="w-full sm:w-auto">
                        <TabsList className="bg-transparent p-0">
                            {DAYS_OF_WEEK.slice(1).map((day, index) => (
                                <TabsTrigger
                                    key={index + 1}
                                    value={String(index + 1)}
                                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    {day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari mapel, guru..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="pl-9 h-9 w-full sm:w-[200px] lg:w-[300px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Bar for Selected Items */}
                <div className="space-y-4">
                    {(selectedIds.length > 0 || daySchedules.length > 0) && (
                        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md border border-border/50">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="select-all"
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredSchedules.length}
                                    onCheckedChange={toggleAllOnDay}
                                />
                                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer ml-1">
                                    Pilih Semua ({filteredSchedules.length})
                                </Label>
                                {selectedIds.length > 0 && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                        • {selectedIds.length} dipilih
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedIds.length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={isBulkDeleting} className="h-8">
                                                {isBulkDeleting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash2 className="h-3 w-3 mr-2" />}
                                                Hapus Terpilih
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus {selectedIds.length} Jadwal?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Semua jadwal yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleBulkDelete}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Ya, Hapus Semua
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                {daySchedules.length > 0 && selectedIds.length === 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 h-8" disabled={isBulkDeleting}>
                                                Clean Data Hari Ini
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Semua Jadwal Hari Ini?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Seluruh data jadwal pada hari {getDayName(selectedDay)} akan dihapus permanen.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleClearDay}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Ya, Bersihkan
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Scrollable Table View */}
                    <div className="border rounded-lg overflow-hidden bg-background">
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="w-[50px] text-center"></TableHead>
                                        <TableHead className="w-[80px] text-center">JP</TableHead>
                                        <TableHead className="w-[120px]">Waktu</TableHead>
                                        <TableHead>Mata Pelajaran</TableHead>
                                        <TableHead>Guru</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSchedules.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                {filterQuery ? 'Tidak ada jadwal yang cocok dengan pencarian' : 'Belum ada jadwal hari ini'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSchedules.map((schedule) => {
                                            const timeSlot = lessonSlots.find(s => s.jp === schedule.jp);
                                            return (
                                                <TableRow key={schedule.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-center">
                                                        <Checkbox
                                                            checked={selectedIds.includes(schedule.id)}
                                                            onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0 rounded-full">
                                                            {schedule.jp}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                                        {timeSlot ? `${timeSlot.startTime} - ${timeSlot.endTime}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-3.5 w-3.5 text-primary opacity-70" />
                                                            {schedule.mapel}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {schedule.guru}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {schedule.classes?.map((cls) => (
                                                                <Badge key={cls} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                    {cls}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => openEditDialog(schedule)}
                                                            >
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Jadwal {schedule.mapel} oleh {schedule.guru} akan dihapus.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(schedule.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Hapus
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
