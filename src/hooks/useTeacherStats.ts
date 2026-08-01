import { useMemo } from 'react';
import { useSchedules, useTeachers, useTasks, useJpCalculationMethod } from '@/hooks/useFirebase';
import { calculateTeacherJP } from '@/lib/scheduleUtils';
import { Schedule, Task, Teacher } from '@/types';

export interface TeacherStat extends Omit<Teacher, 'tasks'> {
    totalJp: number;
    taskJp: number;
    tasks: Task[];
    grandTotal: number;
    byDay: Record<number, number>;
    schedules: Schedule[];
}

export function useTeacherStats(searchQuery = '', sortBy: 'name' | 'jp' = 'name', sortOrder: 'asc' | 'desc' = 'asc') {
    const { schedules, loading: schedulesLoading } = useSchedules();
    const { teachers, loading: teachersLoading } = useTeachers();
    const { tasks } = useTasks();
    const { method } = useJpCalculationMethod();

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

        result = [...result].sort((a, b) => {
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

    return { teacherStats, filteredStats, guruCount, loading: schedulesLoading || teachersLoading, method };
}
