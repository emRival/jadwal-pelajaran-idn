// Type definitions for the schedule app

export interface Schedule {
    id: string;
    day: number;
    jp: number;
    mapel: string;
    guru: string;
    classes: string[];
}

export interface Teacher {
    id: string;
    name: string;
    tasks?: string[];
}

export interface Class {
    id: string;
    name: string;
}

export interface Subject {
    id: string;
    name: string;
}

export interface Task {
    id: string;
    name: string;
    jp: number;
}

export interface TimeSlot {
    id: string;
    type: 'lesson' | 'break';
    jp?: number;
    startTime: string;
    endTime: string;
    name?: string;
    order: number;
}

export interface SignatureSettings {
    headName: string;
    headUrl: string;
    viceName: string;
    viceUrl: string;
}

export interface InfoLink {
    id: string;
    title: string;
    url: string;
    description?: string;
}

export interface AppConfig {
    piketApiUrl?: string;
    jpCalculationMethod: 'byClass' | 'bySession';
}

// Default time slots - these will be seeded to Firebase if collection is empty
export const DEFAULT_TIME_SLOTS: Omit<TimeSlot, 'id'>[] = [
    { type: 'lesson', jp: 1, startTime: '07:30', endTime: '08:15', order: 1 },
    { type: 'lesson', jp: 2, startTime: '08:15', endTime: '09:00', order: 2 },
    { type: 'lesson', jp: 3, startTime: '09:00', endTime: '09:45', order: 3 },
    { type: 'break', name: 'Istirahat', startTime: '09:45', endTime: '10:00', order: 4 },
    { type: 'lesson', jp: 4, startTime: '10:00', endTime: '10:45', order: 5 },
    { type: 'lesson', jp: 5, startTime: '10:45', endTime: '11:30', order: 6 },
    { type: 'break', name: 'ISHOMA & Islamic Public Speaking', startTime: '11:30', endTime: '13:00', order: 7 },
    { type: 'lesson', jp: 6, startTime: '13:00', endTime: '13:45', order: 8 },
    { type: 'lesson', jp: 7, startTime: '13:45', endTime: '14:30', order: 9 },
];

export const DAYS_OF_WEEK = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
];

export const DAYS_OF_WEEK_API = [
    'minggu',
    'senin',
    'selasa',
    'rabu',
    'kamis',
    'jumat',
    'sabtu',
];
