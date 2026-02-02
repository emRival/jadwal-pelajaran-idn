import { TimeSlot, DAYS_OF_WEEK } from '@/types';

// Get current time slot based on time and time slots config
export function getCurrentTimeSlot(timeSlots: TimeSlot[]): TimeSlot | null {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (currentTime >= startMinutes && currentTime < endMinutes) {
            return slot;
        }
    }
    return null;
}

// Get current day (1-6, no Sunday)
export function getCurrentDay(): number {
    const day = new Date().getDay();
    return day === 0 ? 1 : day; // Default to Monday if Sunday
}

// Format time slot for display
export function formatTimeSlot(slot: TimeSlot): string {
    if (slot.type === 'break') {
        return `${slot.name} (${slot.startTime} - ${slot.endTime})`;
    }
    return `JP ${slot.jp} (${slot.startTime} - ${slot.endTime})`;
}

// Get lesson time slots only (no breaks)
export function getLessonTimeSlots(timeSlots: TimeSlot[]): TimeSlot[] {
    return timeSlots.filter(slot => slot.type === 'lesson');
}

// Calculate total JP for a teacher in the schedule
export function calculateTeacherJP(
    teacherName: string,
    schedules: { jp: number; guru: string; classes: string[] }[],
    method: 'byClass' | 'bySession'
): number {
    return schedules
        .filter(s => s.guru === teacherName)
        .reduce((total, schedule) => {
            if (method === 'byClass') {
                return total + (schedule.classes?.length || 1);
            }
            return total + 1;
        }, 0);
}

// Get day name in Indonesian
export function getDayName(dayIndex: number): string {
    return DAYS_OF_WEEK[dayIndex] || '';
}

// Check if current time is in school hours
export function isSchoolHours(timeSlots: TimeSlot[]): boolean {
    if (timeSlots.length === 0) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];

    const [startH, startM] = firstSlot.startTime.split(':').map(Number);
    const [endH, endM] = lastSlot.endTime.split(':').map(Number);

    return currentTime >= (startH * 60 + startM) && currentTime <= (endH * 60 + endM);
}

// Generate unique color for entity
export function getEntityColor(name: string, type: 'teacher' | 'subject' | 'class'): string {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const saturation = type === 'teacher' ? 70 : type === 'subject' ? 60 : 50;
    const lightness = 85;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Find schedule conflicts
export interface ScheduleConflict {
    type: 'teacher' | 'class';
    day: number;
    jp: number;
    entity: string;
    schedules: { id: string; mapel: string; guru: string; classes: string[] }[];
}

export function findScheduleConflicts(
    schedules: { id: string; day: number; jp: number; mapel: string; guru: string; classes: string[] }[]
): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Group schedules by day and jp
    const groupedSchedules = schedules.reduce((acc, schedule) => {
        const key = `${schedule.day}-${schedule.jp}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(schedule);
        return acc;
    }, {} as Record<string, typeof schedules>);

    // Check for conflicts in each time slot
    Object.entries(groupedSchedules).forEach(([key, slotSchedules]) => {
        const [day, jp] = key.split('-').map(Number);

        // Check teacher conflicts
        const teacherMap = new Map<string, typeof slotSchedules>();
        slotSchedules.forEach(schedule => {
            if (!teacherMap.has(schedule.guru)) {
                teacherMap.set(schedule.guru, []);
            }
            teacherMap.get(schedule.guru)!.push(schedule);
        });

        teacherMap.forEach((teacherSchedules, teacher) => {
            if (teacherSchedules.length > 1) {
                conflicts.push({
                    type: 'teacher',
                    day,
                    jp,
                    entity: teacher,
                    schedules: teacherSchedules
                });
            }
        });

        // Check class conflicts
        const classMap = new Map<string, typeof slotSchedules>();
        slotSchedules.forEach(schedule => {
            schedule.classes?.forEach(cls => {
                if (!classMap.has(cls)) {
                    classMap.set(cls, []);
                }
                classMap.get(cls)!.push(schedule);
            });
        });

        classMap.forEach((classSchedules, cls) => {
            if (classSchedules.length > 1) {
                conflicts.push({
                    type: 'class',
                    day,
                    jp,
                    entity: cls,
                    schedules: classSchedules
                });
            }
        });
    });

    return conflicts;
}
