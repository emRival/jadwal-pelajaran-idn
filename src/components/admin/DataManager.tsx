import { useState } from 'react';
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
    Save
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

import { useTeachers, useClasses, useSubjects, useTasks } from '@/hooks/useFirebase';
import { Checkbox } from '@/components/ui/checkbox';

type EntityType = 'teachers' | 'classes' | 'subjects' | 'tasks';

export function DataManager() {
    const { teachers, loading: teachersLoading, addTeacher, updateTeacher, deleteTeacher } = useTeachers();
    const { classes, loading: classesLoading, addClass, deleteClass } = useClasses();
    const { subjects, loading: subjectsLoading, addSubject, deleteSubject } = useSubjects();
    const { tasks, loading: tasksLoading, addTask, deleteTask } = useTasks();

    const [activeTab, setActiveTab] = useState<EntityType>('teachers');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newJp, setNewJp] = useState(1);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    const loading = teachersLoading || classesLoading || subjectsLoading || tasksLoading;

    const getTabConfig = () => {
        switch (activeTab) {
            case 'teachers':
                return {
                    title: 'Guru',
                    icon: Users,
                    items: teachers.map(t => ({ id: t.id, name: t.name, tasks: t.tasks })),
                    addFn: (name: string, tasks?: string[]) => addTeacher(name, tasks),
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
                    items: subjects.map(s => ({ id: s.id, name: s.name })),
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

    const handleSave = async () => {
        if (!newName.trim()) return;

        if (activeTab === 'teachers') {
            if (editingId) {
                await updateTeacher(editingId, {
                    name: newName.trim(),
                    tasks: selectedTasks
                });
            } else {
                await addTeacher(newName.trim(), selectedTasks);
            }
        } else if (activeTab === 'tasks') {
            // Task add logic (tasks doesn't support edit name yet in this simple view)
            await addTask(newName.trim(), newJp);
        } else {
            // Other entities
            await config.addFn(newName.trim());
        }

        handleCloseDialog();
    };

    const handleCloseDialog = () => {
        setNewName('');
        setNewJp(1);
        setEditingId(null);
        setSelectedTasks([]);
        setIsDialogOpen(false);
    };

    const openAddDialog = () => {
        setEditingId(null);
        setNewName('');
        setSelectedTasks([]);
        setNewJp(1);
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: any) => {
        if (activeTab === 'teachers') {
            setEditingId(item.id);
            setNewName(item.name);
            setSelectedTasks(item.tasks || []);
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
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
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
                                                <Label>Tugas Tambahan</Label>
                                                <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto space-y-2">
                                                    {tasks.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">Belum ada data tugas</p>
                                                    ) : (
                                                        tasks.map(task => (
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
                            <div className="border rounded-lg">
                                {config.items.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        Belum ada data {config.title.toLowerCase()}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {config.items.map((item, index) => (
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
                                                    {'jp' in item && (
                                                        <Badge variant="secondary">{(item as any).jp} JP</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {activeTab === 'teachers' && (
                                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                                            <Edit className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                    )}
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
                                Total: {config.items.length} {config.title.toLowerCase()}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
