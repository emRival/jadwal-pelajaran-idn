import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Edit,
    Trash2,
    Users,
    GraduationCap,
    BookOpen,
    ClipboardList,
    Loader2,
    Save,
    Search,
    Check,
    ChevronsUpDown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { useTeachers, useClasses, useSubjects, useTasks } from '@/hooks/useFirebase';
import { Checkbox } from '@/components/ui/checkbox';

type EntityType = 'teachers' | 'classes' | 'subjects' | 'tasks';

export function DataManager() {
    const { teachers, loading: teachersLoading, addTeacher, updateTeacher, deleteTeacher } = useTeachers();
    const { classes, loading: classesLoading, addClass, updateClass, deleteClass } = useClasses();
    const { subjects, loading: subjectsLoading, addSubject, updateSubject, deleteSubject } = useSubjects();
    const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();

    const [activeTab, setActiveTab] = useState<EntityType>('teachers');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newJp, setNewJp] = useState(1);
    const [newGuru, setNewGuru] = useState('');
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [newRole, setNewRole] = useState<'guru' | 'staff'>('guru');
    const [guruDialogOpen, setGuruDialogOpen] = useState(false);
    const [guruDialogSearch, setGuruDialogSearch] = useState('');
    const [listSearch, setListSearch] = useState('');
    const [taskSearch, setTaskSearch] = useState('');

    const loading = teachersLoading || classesLoading || subjectsLoading || tasksLoading;

    const filteredGuru = useMemo(() => {
        if (!guruDialogSearch) return teachers;
        return teachers.filter(t => t.name.toLowerCase().includes(guruDialogSearch.toLowerCase()));
    }, [teachers, guruDialogSearch]);

    const getTabConfig = () => {
        switch (activeTab) {
            case 'teachers':
                return {
                    title: 'Guru',
                    icon: Users,
                    items: teachers.map(t => ({ id: t.id, name: t.name, tasks: t.tasks, role: t.role })),
                    addFn: (name: string, tasks?: string[]) => addTeacher(name, tasks, newRole),
                    deleteFn: deleteTeacher,
                    placeholder: 'Nama guru'
                };
            case 'classes':
                return {
                    title: 'Kelas',
                    icon: GraduationCap,
                    items: classes.map(c => ({ id: c.id, name: c.name })),
                    addFn: (name: string) => addClass(name),
                    deleteFn: deleteClass,
                    placeholder: 'Nama kelas (contoh: 7A)'
                };
            case 'subjects':
                return {
                    title: 'Mata Pelajaran',
                    icon: BookOpen,
                    items: subjects.map(s => ({ id: s.id, name: s.name, guru: s.guru })),
                    addFn: (name: string) => addSubject(name),
                    deleteFn: deleteSubject,
                    placeholder: 'Nama mata pelajaran'
                };
            case 'tasks':
                return {
                    title: 'Tugas/Kegiatan',
                    icon: ClipboardList,
                    items: tasks.map(t => ({ id: t.id, name: t.name, jp: t.jp })),
                    addFn: (name: string) => addTask(name, newJp),
                    deleteFn: deleteTask,
                    placeholder: 'Nama tugas/kegiatan'
                };
        }
    };

    const config = getTabConfig();

    const filteredItems = useMemo(() => {
        if (!listSearch.trim()) return config.items;
        const q = listSearch.toLowerCase();
        return config.items.filter(item => item.name.toLowerCase().includes(q));
    }, [config.items, listSearch]);

    const filteredTasks = useMemo(() => {
        if (!taskSearch.trim()) return tasks;
        const q = taskSearch.toLowerCase();
        return tasks.filter(t => t.name.toLowerCase().includes(q));
    }, [tasks, taskSearch]);

    const handleSave = async () => {
        if (!newName.trim()) return;

        if (activeTab === 'teachers') {
            if (editingId) {
                await updateTeacher(editingId, {
                    name: newName.trim(),
                    tasks: selectedTasks,
                    role: newRole
                });
            } else {
                await addTeacher(newName.trim(), selectedTasks, newRole);
            }
        } else if (activeTab === 'classes') {
            if (editingId) {
                await updateClass(editingId, newName.trim());
            } else {
                await addClass(newName.trim());
            }
        } else if (activeTab === 'subjects') {
            if (editingId) {
                await updateSubject(editingId, {
                    name: newName.trim(),
                    guru: newGuru
                });
            } else {
                await addSubject(newName.trim(), newGuru);
            }
        } else if (activeTab === 'tasks') {
            if (editingId) {
                await updateTask(editingId, { name: newName.trim(), jp: newJp });
            } else {
                await addTask(newName.trim(), newJp);
            }
        }

        handleCloseDialog();
    };

    const handleCloseDialog = () => {
        setNewName('');
        setNewJp(1);
        setNewGuru('');
        setEditingId(null);
        setSelectedTasks([]);
        setGuruDialogOpen(false);
        setGuruDialogSearch('');
        setTaskSearch('');
        setIsDialogOpen(false);
    };

    const openAddDialog = () => {
        setEditingId(null);
        setNewName('');
        setNewGuru('');
        setSelectedTasks([]);
        setNewRole('guru');
        setNewJp(1);
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: any) => {
        if (activeTab === 'teachers') {
            setEditingId(item.id);
            setNewName(item.name);
            setSelectedTasks(item.tasks || []);
            setNewRole(item.role || 'guru');
            setIsDialogOpen(true);
        } else if (activeTab === 'classes') {
            setEditingId(item.id);
            setNewName(item.name);
            setIsDialogOpen(true);
        } else if (activeTab === 'subjects') {
            setEditingId(item.id);
            setNewName(item.name);
            setNewGuru(item.guru || '');
            setIsDialogOpen(true);
        } else if (activeTab === 'tasks') {
            setEditingId(item.id);
            setNewName(item.name);
            setNewJp(item.jp || 1);
            setIsDialogOpen(true);
        }
    };

    const handleDelete = async (id: string) => {
        await config.deleteFn(id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kelola Data Master</CardTitle>
                <CardDescription>
                    Tambah, edit, atau hapus data guru, kelas, mata pelajaran, dan tugas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as EntityType); setListSearch(''); }}>
                    <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="teachers" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Guru</span>
                        </TabsTrigger>
                        <TabsTrigger value="classes" className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span className="hidden sm:inline">Kelas</span>
                        </TabsTrigger>
                        <TabsTrigger value="subjects" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">Mapel</span>
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            <span className="hidden sm:inline">Tugas</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-6">
                        <div className="space-y-4">
                            {/* Add Button */}
                            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                                <DialogTrigger asChild>
                                    <Button onClick={openAddDialog}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Tambah {config.title}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingId ? `Edit ${config.title}` : `Tambah ${config.title} Baru`}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {editingId ? `Ubah data ${config.title.toLowerCase()}` : `Masukkan data ${config.title.toLowerCase()} yang ingin ditambahkan`}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nama</Label>
                                            <Input
                                                placeholder={config.placeholder}
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                            />
                                        </div>
                                        {activeTab === 'teachers' && (
                                            <div className="space-y-2">
                                                <Label>Role</Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={newRole === 'guru' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => setNewRole('guru')}
                                                    >
                                                        Guru
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={newRole === 'staff' ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => setNewRole('staff')}
                                                    >
                                                        Staff
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        {activeTab === 'teachers' && (
                                            <div className="space-y-2">
                                                <Label>Tugas Tambahan</Label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                    <Input
                                                        placeholder="Cari tugas..."
                                                        value={taskSearch}
                                                        onChange={(e) => setTaskSearch(e.target.value)}
                                                        className="pl-9"
                                                    />
                                                </div>
                                                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto space-y-2">
                                                    {filteredTasks.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">{taskSearch ? 'Tidak ada tugas ditemukan' : 'Belum ada data tugas'}</p>
                                                    ) : (
                                                        filteredTasks.map(task => (
                                                            <div key={task.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`task-${task.id}`}
                                                                    checked={selectedTasks.includes(task.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setSelectedTasks([...selectedTasks, task.id]);
                                                                        } else {
                                                                            setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor={`task-${task.id}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {task.name} ({task.jp} JP)
                                                                </label>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'subjects' && (
                                            <div className="space-y-2">
                                                <Label>Guru</Label>
                                                <Popover open={guruDialogOpen} onOpenChange={setGuruDialogOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {newGuru ? newGuru : "Pilih guru..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <div className="flex items-center border-b px-3">
                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                            <input
                                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Cari guru..."
                                                                value={guruDialogSearch}
                                                                onChange={(e) => setGuruDialogSearch(e.target.value)}
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
                                                                            newGuru === teacher.name ? "bg-accent text-accent-foreground" : ""
                                                                        )}
                                                                        onClick={() => {
                                                                            setNewGuru(teacher.name);
                                                                            setGuruDialogOpen(false);
                                                                            setGuruDialogSearch('');
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                newGuru === teacher.name ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {teacher.name}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <p className="text-xs text-muted-foreground">
                                                    Guru akan otomatis terisi saat memilih mapel di jadwal
                                                </p>
                                            </div>
                                        )}

                                        {activeTab === 'tasks' && (
                                            <div className="space-y-2">
                                                <Label>Jumlah JP</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={newJp}
                                                    onChange={(e) => setNewJp(Number(e.target.value))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={handleCloseDialog}>
                                            Batal
                                        </Button>
                                        <Button onClick={handleSave} disabled={!newName.trim()}>
                                            <Save className="h-4 w-4 mr-2" />
                                            Simpan
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Items List */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder={`Cari ${config.title.toLowerCase()}...`}
                                    value={listSearch}
                                    onChange={(e) => setListSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="border rounded-lg">
                                {filteredItems.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {listSearch ? `Tidak ada ${config.title.toLowerCase()} ditemukan` : `Belum ada data ${config.title.toLowerCase()}`}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {filteredItems.map((item, index) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center justify-between p-3 hover:bg-muted/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <config.icon className="h-4 w-4 text-muted-foreground" />
                                                    <span>{item.name}</span>
                                                    {'role' in item && (
                                                        <Badge variant={(item as any).role === 'staff' ? 'secondary' : 'default'} className="text-[10px]">
                                                            {(item as any).role === 'staff' ? 'Staff' : 'Guru'}
                                                        </Badge>
                                                    )}
                                                    {'jp' in item && (
                                                        <Badge variant="secondary">{(item as any).jp} JP</Badge>
                                                    )}
                                                    {'guru' in item && (item as any).guru && (
                                                        <Badge variant="outline">{(item as any).guru}</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Hapus {config.title}?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    "{item.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(item.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Hapus
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="text-sm text-muted-foreground">
                                Total: {filteredItems.length} {config.title.toLowerCase()}{listSearch ? ` dari ${config.items.length}` : ''}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
