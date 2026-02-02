import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Clock,
    Trash2,
    ChevronUp,
    ChevronDown,
    Loader2,
    Save,
    Coffee
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

import { useTimeSlots } from '@/hooks/useFirebase';
import { TimeSlot } from '@/types';

export function TimeSlotManager() {
    const { timeSlots, loading, isUsingDefaults, addTimeSlot, updateTimeSlot, deleteTimeSlot, seedDefaultTimeSlots } = useTimeSlots();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
    const [seeding, setSeeding] = useState(false);

    // Form state
    const [formType, setFormType] = useState<'lesson' | 'break'>('lesson');
    const [formJp, setFormJp] = useState<number>(1);
    const [formName, setFormName] = useState('');
    const [formStartTime, setFormStartTime] = useState('07:30');
    const [formEndTime, setFormEndTime] = useState('08:15');

    const handleInitialize = async () => {
        setSeeding(true);
        try {
            await seedDefaultTimeSlots();
        } catch (error) {
            console.error('Failed to initialize time slots:', error);
        } finally {
            setSeeding(false);
        }
    };

    const resetForm = () => {
        setFormType('lesson');
        setFormJp(getNextJpNumber());
        setFormName('');
        setFormStartTime('07:30');
        setFormEndTime('08:15');
        setEditingSlot(null);
    };

    const getNextJpNumber = () => {
        const jpNumbers = timeSlots
            .filter(s => s.type === 'lesson')
            .map(s => s.jp || 0);
        return jpNumbers.length > 0 ? Math.max(...jpNumbers) + 1 : 1;
    };

    const getNextOrder = () => {
        return timeSlots.length > 0 ? Math.max(...timeSlots.map(s => s.order)) + 1 : 1;
    };

    const openAddDialog = () => {
        resetForm();
        // Pre-fill with next logical time
        if (timeSlots.length > 0) {
            const lastSlot = timeSlots[timeSlots.length - 1];
            setFormStartTime(lastSlot.endTime);
            // Add 45 minutes
            const [h, m] = lastSlot.endTime.split(':').map(Number);
            const endMinutes = h * 60 + m + 45;
            setFormEndTime(
                `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
            );
        }
        setIsDialogOpen(true);
    };

    const openEditDialog = (slot: TimeSlot) => {
        setEditingSlot(slot);
        setFormType(slot.type);
        setFormJp(slot.jp || 1);
        setFormName(slot.name || '');
        setFormStartTime(slot.startTime);
        setFormEndTime(slot.endTime);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        const data: Omit<TimeSlot, 'id'> = {
            type: formType,
            startTime: formStartTime,
            endTime: formEndTime,
            order: editingSlot?.order || getNextOrder()
        };

        if (formType === 'lesson') {
            data.jp = formJp;
        } else {
            data.name = formName;
        }

        if (editingSlot) {
            await updateTimeSlot(editingSlot.id, data);
        } else {
            await addTimeSlot(data);
        }

        setIsDialogOpen(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        await deleteTimeSlot(id);
    };

    const moveSlot = async (index: number, direction: 'up' | 'down') => {
        if (isUsingDefaults) {
            console.warn('Cannot reorder default time slots');
            return;
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= timeSlots.length) return;

        // Get the two slots to swap
        const currentSlot = timeSlots[index];
        const targetSlot = timeSlots[newIndex];

        // Use unique order values based on their new positions
        // This handles cases where order values might be duplicated
        const currentOrder = currentSlot.order;
        const targetOrder = targetSlot.order;

        // If they have the same order, assign new unique values
        const newCurrentOrder = currentOrder === targetOrder
            ? (direction === 'up' ? targetOrder - 1 : targetOrder + 1)
            : targetOrder;
        const newTargetOrder = currentOrder === targetOrder
            ? currentOrder
            : currentOrder;

        try {
            await updateTimeSlot(currentSlot.id, { order: newCurrentOrder });
            await updateTimeSlot(targetSlot.id, { order: newTargetOrder });
        } catch (error) {
            console.error('Failed to reorder slots:', error);
        }
    };

    // Fix all order values to be sequential (useful when orders are duplicated)
    const fixOrderValues = async () => {
        if (isUsingDefaults) return;

        try {
            for (let i = 0; i < timeSlots.length; i++) {
                const slot = timeSlots[i];
                if (slot.order !== i + 1) {
                    await updateTimeSlot(slot.id, { order: i + 1 });
                }
            }
        } catch (error) {
            console.error('Failed to fix order values:', error);
        }
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
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pengaturan Waktu Pelajaran
                </CardTitle>
                <CardDescription>
                    Kelola jam pelajaran dan waktu istirahat
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Warning for default slots */}
                    {isUsingDefaults && (
                        <Alert variant="default" className="border-amber-500 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Waktu Default</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                <p className="mb-2">
                                    Saat ini menggunakan pengaturan waktu default. Klik tombol di bawah untuk menyimpan ke database
                                    agar bisa diedit.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={handleInitialize}
                                    disabled={seeding}
                                >
                                    {seeding ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan ke Database'
                                    )}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openAddDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Waktu
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingSlot ? 'Edit Waktu' : 'Tambah Waktu Baru'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Atur jadwal waktu untuk pelajaran atau istirahat
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    {/* Type Selection */}
                                    <div className="space-y-2">
                                        <Label>Tipe</Label>
                                        <Select value={formType} onValueChange={(v) => setFormType(v as 'lesson' | 'break')}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lesson">Jam Pelajaran</SelectItem>
                                                <SelectItem value="break">Istirahat</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* JP Number (for lessons) */}
                                    {formType === 'lesson' && (
                                        <div className="space-y-2">
                                            <Label>Nomor JP</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={formJp}
                                                onChange={(e) => setFormJp(Number(e.target.value))}
                                            />
                                        </div>
                                    )}

                                    {/* Name (for breaks) */}
                                    {formType === 'break' && (
                                        <div className="space-y-2">
                                            <Label>Nama Istirahat</Label>
                                            <Input
                                                placeholder="Contoh: Istirahat, ISHOMA"
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* Time Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Waktu Mulai</Label>
                                            <Input
                                                type="time"
                                                value={formStartTime}
                                                onChange={(e) => setFormStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Waktu Selesai</Label>
                                            <Input
                                                type="time"
                                                value={formEndTime}
                                                onChange={(e) => setFormEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={formType === 'break' && !formName.trim()}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Simpan
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Fix Order Button */}
                        {!isUsingDefaults && (
                            <Button
                                variant="outline"
                                onClick={fixOrderValues}
                                title="Perbaiki urutan jika tombol geser tidak berfungsi"
                            >
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                Perbaiki Urutan
                            </Button>
                        )}
                    </div>

                    {/* Time Slots List */}
                    <div className="border rounded-lg divide-y">
                        {timeSlots.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                Belum ada pengaturan waktu
                            </div>
                        ) : (
                            timeSlots.map((slot, index) => (
                                <motion.div
                                    key={slot.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`flex items-center justify-between p-4 ${slot.type === 'break' ? 'bg-green-50 dark:bg-green-950' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Move buttons */}
                                        <div className="flex flex-col gap-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => moveSlot(index, 'up')}
                                                disabled={index === 0 || isUsingDefaults}
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => moveSlot(index, 'down')}
                                                disabled={index === timeSlots.length - 1 || isUsingDefaults}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {slot.type === 'break' ? (
                                                <>
                                                    <Coffee className="h-4 w-4 text-green-600" />
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                        {slot.name}
                                                    </Badge>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="h-4 w-4 text-primary" />
                                                    <Badge>JP {slot.jp}</Badge>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-muted-foreground">
                                            {slot.startTime} - {slot.endTime}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(slot)}
                                            disabled={isUsingDefaults}
                                        >
                                            Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isUsingDefaults}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Waktu?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {slot.type === 'lesson'
                                                            ? `JP ${slot.jp}`
                                                            : slot.name} akan dihapus. Tindakan ini tidak dapat dibatalkan.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(slot.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Hapus
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
