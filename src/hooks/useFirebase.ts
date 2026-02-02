import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    getDoc,
    getDocs,
    writeBatch,
    query,
    where
} from 'firebase/firestore';
import { db, getDbPath, APP_ID } from '@/lib/firebase';
import {
    Schedule,
    Teacher,
    Class,
    Subject,
    Task,
    TimeSlot,
    SignatureSettings,
    InfoLink,
    DEFAULT_TIME_SLOTS
} from '@/types';

// Hook for real-time schedules
export function useSchedules() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('schedules')),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Schedule[];
                setSchedules(data);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addSchedule = async (schedule: Omit<Schedule, 'id'>) => {
        await addDoc(collection(db, getDbPath('schedules')), schedule);
    };

    const updateSchedule = async (id: string, data: Partial<Schedule>) => {
        await updateDoc(doc(db, getDbPath('schedules'), id), data);
    };

    const deleteSchedule = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('schedules'), id));
    };

    const bulkDeleteSchedules = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, getDbPath('schedules'), id));
        });
        await batch.commit();
    };

    return { schedules, loading, addSchedule, updateSchedule, deleteSchedule, bulkDeleteSchedules };
}

// Hook for real-time teachers
export function useTeachers() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('guru')),
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Teacher[];
                setTeachers(data.sort((a, b) => a.name.localeCompare(b.name)));
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addTeacher = async (name: string, tasks: string[] = []) => {
        await addDoc(collection(db, getDbPath('guru')), { name, tasks });
    };

    const updateTeacher = async (id: string, data: Partial<Teacher>) => {
        await updateDoc(doc(db, getDbPath('guru'), id), data);
    };

    const deleteTeacher = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('guru'), id));
    };

    return { teachers, loading, addTeacher, updateTeacher, deleteTeacher };
}

// Hook for real-time classes
export function useClasses() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('kelas')),
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Class[];
                // Custom sort for classes
                setClasses(data.sort((a, b) => {
                    const gradeA = parseInt(a.name.match(/^\d+/)?.[0] || '0');
                    const gradeB = parseInt(b.name.match(/^\d+/)?.[0] || '0');
                    if (gradeA !== gradeB) return gradeA - gradeB;
                    return a.name.localeCompare(b.name);
                }));
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addClass = async (name: string) => {
        await addDoc(collection(db, getDbPath('kelas')), { name });
    };

    const updateClass = async (id: string, name: string) => {
        await updateDoc(doc(db, getDbPath('kelas'), id), { name });
    };

    const deleteClass = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('kelas'), id));
    };

    return { classes, loading, addClass, updateClass, deleteClass };
}

// Hook for real-time subjects
export function useSubjects() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('mapel')),
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Subject[];
                setSubjects(data.sort((a, b) => a.name.localeCompare(b.name)));
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addSubject = async (name: string) => {
        await addDoc(collection(db, getDbPath('mapel')), { name });
    };

    const updateSubject = async (id: string, name: string) => {
        await updateDoc(doc(db, getDbPath('mapel'), id), { name });
    };

    const deleteSubject = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('mapel'), id));
    };

    return { subjects, loading, addSubject, updateSubject, deleteSubject };
}

// Hook for real-time tasks
export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('tugas')),
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
                setTasks(data.sort((a, b) => a.name.localeCompare(b.name)));
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addTask = async (name: string, jp: number) => {
        await addDoc(collection(db, getDbPath('tugas')), { name, jp });
    };

    const updateTask = async (id: string, data: Partial<Task>) => {
        await updateDoc(doc(db, getDbPath('tugas'), id), data);
    };

    const deleteTask = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('tugas'), id));
    };

    return { tasks, loading, addTask, updateTask, deleteTask };
}

// Hook for time slots - uses default values if collection is empty
export function useTimeSlots() {
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUsingDefaults, setIsUsingDefaults] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('timeSlots')),
            (snapshot) => {
                if (snapshot.empty) {
                    // Use default time slots if collection is empty (no write attempt)
                    const defaultSlots = DEFAULT_TIME_SLOTS.map((slot, index) => ({
                        ...slot,
                        id: `default-${index}`,
                        order: index + 1
                    }));
                    setTimeSlots(defaultSlots);
                    setIsUsingDefaults(true);
                } else {
                    const data = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() })) as TimeSlot[];
                    setTimeSlots(data.sort((a, b) => a.order - b.order));
                    setIsUsingDefaults(false);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error loading time slots:', error);
                // Fallback to defaults on error
                const defaultSlots = DEFAULT_TIME_SLOTS.map((slot, index) => ({
                    ...slot,
                    id: `default-${index}`,
                    order: index + 1
                }));
                setTimeSlots(defaultSlots);
                setIsUsingDefaults(true);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    // Seed default time slots to Firestore (for admin use)
    const seedDefaultTimeSlots = async () => {
        const batch = writeBatch(db);
        DEFAULT_TIME_SLOTS.forEach((slot, index) => {
            const docRef = doc(collection(db, getDbPath('timeSlots')));
            batch.set(docRef, { ...slot, order: index + 1 });
        });
        await batch.commit();
    };

    const addTimeSlot = async (slot: Omit<TimeSlot, 'id'>) => {
        // If using defaults, seed first then add
        if (isUsingDefaults) {
            await seedDefaultTimeSlots();
        }
        await addDoc(collection(db, getDbPath('timeSlots')), slot);
    };

    const updateTimeSlot = async (id: string, data: Partial<TimeSlot>) => {
        // Can't update default slots
        if (id.startsWith('default-')) {
            throw new Error('Cannot update default time slots. Please add a new time slot first to initialize the database.');
        }
        await updateDoc(doc(db, getDbPath('timeSlots'), id), data);
    };

    const deleteTimeSlot = async (id: string) => {
        // Can't delete default slots
        if (id.startsWith('default-')) {
            throw new Error('Cannot delete default time slots. Please add a new time slot first to initialize the database.');
        }
        await deleteDoc(doc(db, getDbPath('timeSlots'), id));
    };

    const reorderTimeSlots = async (slots: TimeSlot[]) => {
        const batch = writeBatch(db);
        slots.forEach((slot, index) => {
            if (!slot.id.startsWith('default-')) {
                batch.update(doc(db, getDbPath('timeSlots'), slot.id), { order: index + 1 });
            }
        });
        await batch.commit();
    };

    return {
        timeSlots,
        loading,
        isUsingDefaults,
        addTimeSlot,
        updateTimeSlot,
        deleteTimeSlot,
        reorderTimeSlots,
        seedDefaultTimeSlots
    };
}

// Hook for signature settings
export function useSignatureSettings() {
    const [settings, setSettings] = useState<SignatureSettings>({
        headName: '',
        headUrl: '',
        viceName: '',
        viceUrl: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, getDbPath('config'), 'signatures'),
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings(snapshot.data() as SignatureSettings);
                }
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const updateSettings = async (data: SignatureSettings) => {
        await setDoc(doc(db, getDbPath('config'), 'signatures'), data);
    };

    return { settings, loading, updateSettings };
}



// Hook for info links
export function useInfoLinks() {
    const [infoLinks, setInfoLinks] = useState<InfoLink[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, getDbPath('infoLinks')),
            (snapshot) => {
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as InfoLink[];
                setInfoLinks(data);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const addInfoLink = async (link: Omit<InfoLink, 'id'>) => {
        await addDoc(collection(db, getDbPath('infoLinks')), link);
    };

    const updateInfoLink = async (id: string, data: Partial<InfoLink>) => {
        await updateDoc(doc(db, getDbPath('infoLinks'), id), data);
    };

    const deleteInfoLink = async (id: string) => {
        await deleteDoc(doc(db, getDbPath('infoLinks'), id));
    };

    return { infoLinks, loading, addInfoLink, updateInfoLink, deleteInfoLink };
}

// Hook for checking admin status
export function useAdminCheck(userId: string | null) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        const checkAdmin = async () => {
            const adminDoc = await getDoc(doc(db, getDbPath('admins'), userId));
            setIsAdmin(adminDoc.exists());
            setLoading(false);
        };

        checkAdmin();
    }, [userId]);

    return { isAdmin, loading };
}

// Hook for JP calculation method
export function useJpCalculationMethod() {
    const [method, setMethod] = useState<'byClass' | 'bySession'>('byClass');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, getDbPath('config'), 'jpCalculation'),
            (snapshot) => {
                if (snapshot.exists()) {
                    setMethod(snapshot.data().method || 'byClass');
                }
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const updateMethod = async (newMethod: 'byClass' | 'bySession') => {
        await setDoc(doc(db, getDbPath('config'), 'jpCalculation'), { method: newMethod });
    };

    return { method, loading, updateMethod };
}

// Hook for Piket API
export function usePiketApi() {
    const [apiUrl, setApiUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, getDbPath('config'), 'piketApi'),
            (snapshot) => {
                if (snapshot.exists()) {
                    setApiUrl(snapshot.data().url || '');
                }
                setLoading(false);
            }
        );
        return unsubscribe;
    }, []);

    const updateApiUrl = async (url: string) => {
        await setDoc(doc(db, getDbPath('config'), 'piketApi'), { url });
    };

    return { apiUrl, loading, updateApiUrl };
}
