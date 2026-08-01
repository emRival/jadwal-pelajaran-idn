import { Utensils, School, Building2, Laptop, Home } from 'lucide-react';

export const PIKET_TYPES = [
    { key: 'piket_dapur', title: 'Piket Dapur', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'kelas_smp', title: 'Piket Kelas SMP', icon: School, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'kelas_smk', title: 'Piket Kelas SMK', icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { key: 'piket_laptop', title: 'Piket Laptop', icon: Laptop, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'piket_masjid', title: 'Piket Masjid', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];
