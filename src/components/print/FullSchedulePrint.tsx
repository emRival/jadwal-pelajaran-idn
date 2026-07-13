import React, { useMemo } from 'react';
import { Schedule, TimeSlot, DAYS_OF_WEEK } from '@/types';
import { DEFAULT_TIME_SLOTS } from '@/types';
import { PrintLayout } from './PrintLayout';
import { SignatureSettings, InfoLink } from '@/types';

interface FullSchedulePrintProps {
    schedules: Schedule[];
    timeSlots?: TimeSlot[];
    signatureSettings?: SignatureSettings | null;
    infoLinks?: InfoLink[];
    showQr?: boolean;
}

type TeacherCodeMap = Map<string, { code: string; category: string }>;

function getSubjectCategory(mapel: string): 'IT' | 'Diniyah' | 'English' | 'BK' {
    const parts = mapel.split('-');
    if (parts.length > 1) {
        const prefix = parts[0].trim().toUpperCase();
        if (prefix === 'IT') return 'IT';
        if (prefix === 'ENGLISH' || prefix === 'INGGRIS') return 'English';
        if (prefix === 'DINIYAH' || prefix === 'PAI' || prefix === 'ADAB') return 'Diniyah';
        if (prefix === 'BK') return 'BK';
    }

    const lower = mapel.toLowerCase();
    if (lower.includes('english') || lower.includes('inggris')) return 'English';
    if (lower.includes('diniyah') || lower.includes('pai') || lower.includes('qur') || lower.includes('hadits') || lower.includes('fiqih') || lower.includes('akidah') || lower.includes('arab')) return 'Diniyah';
    if (lower.includes('bk') || lower.includes('konseling')) return 'BK';

    return 'IT';
}

function extractGrade(className: string): number {
    return parseInt(className.match(/^\d+/)?.[0] || '0');
}

function sortClasses(classes: string[]): string[] {
    return [...classes].sort((a, b) => {
        const gradeA = extractGrade(a);
        const gradeB = extractGrade(b);
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a.localeCompare(b);
    });
}

function generateCodeMaps(schedules: Schedule[]) {
    const smpTeachers = { IT: new Set<string>(), Diniyah: new Set<string>(), English: new Set<string>(), BK: new Set<string>() };

    schedules.forEach(s => {
        if (!s.guru || !s.classes || s.classes.length === 0) return;

        const category = getSubjectCategory(s.mapel);
        const className = s.classes[0];
        const grade = extractGrade(className);

        // SMP classes only (Grade 7 - 9)
        if (grade >= 7 && grade <= 9) {
            smpTeachers[category].add(s.guru);
        }
    });

    const createMap = (teacherSets: typeof smpTeachers) => {
        const map = new Map<string, { code: string; category: string }>();
        (Object.keys(teacherSets) as Array<keyof typeof teacherSets>).forEach(cat => {
            const sorted = Array.from(teacherSets[cat]).sort();
            sorted.forEach((teacher, idx) => {
                let prefix = cat === 'Diniyah' ? 'DN' : cat === 'English' ? 'EN' : cat;
                map.set(teacher, { code: `${prefix}-${idx + 1}`, category: cat });
            });
        });
        return map;
    };

    return {
        smpMap: createMap(smpTeachers)
    };
}

export function FullSchedulePrint({ schedules, timeSlots = (DEFAULT_TIME_SLOTS as any), signatureSettings, infoLinks = [], showQr = false }: FullSchedulePrintProps) {
    const { smpMap } = useMemo(() => generateCodeMaps(schedules), [schedules]);

    const weekdayTimeSlots = useMemo(() => {
        return timeSlots.filter(slot => slot.dayType !== 'saturday').sort((a, b) => a.order - b.order);
    }, [timeSlots]);

    const { smpClasses, activeDays } = useMemo(() => {
        const classSet = new Set<string>();
        const daySet = new Set<number>();

        schedules.forEach(s => {
            (s.classes || []).forEach(c => classSet.add(c));
            if (s.day) daySet.add(Number(s.day));
        });

        const allClasses = sortClasses(Array.from(classSet));
        const smp = allClasses.filter(c => {
            const g = extractGrade(c);
            return g >= 7 && g <= 9;
        });

        const days = Array.from(daySet).filter(d => d >= 1 && d <= 6).sort((a, b) => a - b);

        return { smpClasses: smp, activeDays: days };
    }, [schedules]);

    const renderTable = (classes: string[], codeMap: TeacherCodeMap) => (
        <div className="border border-slate-950 overflow-hidden rounded-md">
            <table className="w-full border-collapse text-[6px] table-fixed print-table">
                <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                        <th rowSpan={2} className="w-[5%] border-r border-slate-950 p-1 font-bold text-center">Waktu</th>
                        <th rowSpan={2} className="w-[2%] border-r border-slate-950 p-1 font-bold text-center">Ke</th>
                        {activeDays.map((dayNum, i) => (
                            <th key={dayNum} colSpan={classes.length} className={`border-r last:border-r-0 border-slate-950 p-1 font-bold uppercase text-center ${i % 2 === 0 ? 'bg-slate-50/50' : 'bg-slate-100/50'}`}>
                                {DAYS_OF_WEEK[dayNum]}
                            </th>
                        ))}
                    </tr>
                    <tr className="border-b border-slate-950">
                        {activeDays.map(dayNum => (
                            <React.Fragment key={dayNum + '-sub'}>
                                {classes.map(cls => (
                                    <th key={dayNum + cls} className="border-r last:border-r-0 border-slate-950 p-0.5 text-center font-bold text-[6px] bg-slate-50 text-slate-800">
                                        {cls}
                                    </th>
                                ))}
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weekdayTimeSlots.map(slot => {
                        const isBreak = slot.type === 'break';
                        if (isBreak) {
                            return (
                                <tr key={slot.id || slot.order} className="border-b border-slate-950 bg-emerald-50/40">
                                    <td colSpan={2 + (activeDays.length * classes.length)} className="text-center font-bold py-1 text-[7px] text-emerald-800 tracking-wider">
                                        {slot.name || 'Istirahat'}
                                    </td>
                                </tr>
                            );
                        }

                        return (
                            <tr key={slot.id || slot.order} className="border-b last:border-b-0 border-slate-950">
                                <td className="border-r border-slate-950 text-center p-0.5 font-bold bg-slate-50/60 font-mono text-[5.5px] align-middle">{slot.startTime}-{slot.endTime}</td>
                                <td className="border-r border-slate-950 text-center p-0.5 font-bold bg-slate-50/40 align-middle">{slot.jp}</td>

                                {activeDays.map(dayNum => (
                                    <React.Fragment key={dayNum}>
                                        {classes.map(cls => {
                                            const schedule = schedules.find(s =>
                                                Number(s.day) === dayNum &&
                                                Number(s.jp) === Number(slot.jp) &&
                                                (s.classes || []).includes(cls)
                                            );

                                            let content = '-';
                                            let cellStyle: React.CSSProperties = {};

                                            if (schedule && schedule.guru) {
                                                const info = codeMap.get(schedule.guru);
                                                if (info) {
                                                    content = info.code;
                                                    if (info.category === 'IT') {
                                                        cellStyle = { backgroundColor: '#fef3c7', color: '#92400e' }; // Amber
                                                    } else if (info.category === 'Diniyah') {
                                                        cellStyle = { backgroundColor: '#d1fae5', color: '#065f46' }; // Emerald
                                                    } else if (info.category === 'English') {
                                                        cellStyle = { backgroundColor: '#e0f2fe', color: '#075985' }; // Sky
                                                    } else if (info.category === 'BK') {
                                                        cellStyle = { backgroundColor: '#ffe4e6', color: '#9f1239' }; // Rose
                                                    }
                                                } else {
                                                    content = schedule.guru.substring(0, 3).toUpperCase();
                                                }
                                            }

                                            return (
                                                <td key={`${dayNum}-${cls}`} className="border-r last:border-r-0 border-slate-950 text-center p-0.5 align-middle" style={cellStyle}>
                                                    <strong className="text-[8px] font-bold">{content}</strong>
                                                </td>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderLegend = (codeMap: TeacherCodeMap) => {
        const categories = ['IT', 'English', 'Diniyah', 'BK'];
        return (
            <div className="grid grid-cols-4 gap-4 mt-4 text-[7px] leading-tight border border-slate-200 p-3 rounded-lg bg-slate-50/30">
                {categories.map(cat => {
                    const items: { code: string, teacher: string }[] = [];
                    codeMap.forEach((val, key) => {
                        if (val.category === cat) items.push({ code: val.code, teacher: key });
                    });
                    if (items.length === 0) return null;

                    items.sort((a, b) => {
                        const numA = parseInt(a.code.split('-')[1]);
                        const numB = parseInt(b.code.split('-')[1]);
                        return numA - numB;
                    });

                    let colorDot = '';
                    let titleStyle = '';
                    if (cat === 'IT') {
                        colorDot = 'bg-amber-500';
                        titleStyle = 'text-amber-800 border-amber-200';
                    } else if (cat === 'Diniyah') {
                        colorDot = 'bg-emerald-500';
                        titleStyle = 'text-emerald-800 border-emerald-200';
                    } else if (cat === 'English') {
                        colorDot = 'bg-sky-500';
                        titleStyle = 'text-sky-800 border-sky-200';
                    } else if (cat === 'BK') {
                        colorDot = 'bg-rose-500';
                        titleStyle = 'text-rose-800 border-rose-200';
                    }

                    return (
                        <div key={cat} className="flex flex-col gap-1.5">
                            <h4 className={`font-bold border-b pb-1 uppercase tracking-wider text-[8px] ${titleStyle}`}>
                                {cat}
                            </h4>
                            <div className="flex flex-col gap-0.5">
                                {items.map(item => (
                                    <div key={item.code} className="flex items-center gap-1.5 py-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${colorDot}`}></span>
                                        <strong className="text-slate-800">{item.code}:</strong> 
                                        <span className="text-slate-600 truncate max-w-[120px]">{item.teacher}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    };

    const hasSmp = smpClasses.length > 0;

    if (!hasSmp) {
        return (
            <div className="w-full text-center py-10 text-muted-foreground">
                Tidak ada data jadwal SMP untuk ditampilkan.
            </div>
        );
    }

    return (
        <div className="w-full">
            <PrintLayout
                title="JADWAL PELAJARAN GABUNGAN - SMP"
                signatureSettings={signatureSettings || null}
                infoLinks={infoLinks}
                landscape={true}
                showQr={showQr}
            >
                <div className="mb-4">
                    {renderTable(smpClasses, smpMap)}
                    {renderLegend(smpMap)}
                </div>
            </PrintLayout>
        </div>
    );
}
