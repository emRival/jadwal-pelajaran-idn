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
    const smkTeachers = { IT: new Set<string>(), Diniyah: new Set<string>(), English: new Set<string>(), BK: new Set<string>() };

    schedules.forEach(s => {
        if (!s.guru || !s.classes || s.classes.length === 0) return;

        const category = getSubjectCategory(s.mapel);
        const className = s.classes[0];
        const grade = extractGrade(className);

        if (grade >= 7 && grade <= 9) {
            smpTeachers[category].add(s.guru);
        } else if (grade >= 10 && grade <= 12) {
            smkTeachers[category].add(s.guru);
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
        smpMap: createMap(smpTeachers),
        smkMap: createMap(smkTeachers)
    };
}

export function FullSchedulePrint({ schedules, timeSlots = (DEFAULT_TIME_SLOTS as any), signatureSettings, infoLinks = [], showQr = false }: FullSchedulePrintProps) {
    const { smpMap, smkMap } = useMemo(() => generateCodeMaps(schedules), [schedules]);
    const weekdayTimeSlots = useMemo(() => timeSlots.filter(slot => slot.dayType !== 'saturday'), [timeSlots]);

    const { smpClasses, smkClasses, activeDays } = useMemo(() => {
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
        const smk = allClasses.filter(c => {
            const g = extractGrade(c);
            return g >= 10 && g <= 12;
        });

        const days = Array.from(daySet).sort((a, b) => a - b);

        return { smpClasses: smp, smkClasses: smk, activeDays: days };
    }, [schedules]);

    const renderTable = (level: 'SMP' | 'SMK', classes: string[], codeMap: TeacherCodeMap) => (
        <table className="w-full border-collapse text-[6px] table-fixed print-table">
            <thead>
                <tr>
                    <th rowSpan={2} className="w-[5%] border border-black bg-gray-100 p-1">Jam/Waktu</th>
                    <th rowSpan={2} className="w-[2%] border border-black bg-gray-100 p-1">Ke</th>
                    {activeDays.map(dayNum => (
                        <th key={dayNum} colSpan={classes.length} className="border border-black bg-gray-100 p-1 font-bold uppercase">{DAYS_OF_WEEK[dayNum]}</th>
                    ))}
                </tr>
                <tr>
                    {activeDays.map(dayNum => (
                        <React.Fragment key={dayNum + '-sub'}>
                            {classes.map(cls => (
                                <th key={dayNum + cls} className={`border border-black p-0.5 text-center font-bold text-[6px] ${level === 'SMK' ? (cls.startsWith('10') ? 'bg-blue-50' : 'bg-green-50') : 'bg-gray-200'}`}>
                                    {cls}
                                </th>
                            ))}
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {weekdayTimeSlots.sort((a, b) => a.order - b.order).map(slot => {
                    const isBreak = slot.type === 'break';
                    if (isBreak) {
                        return (
                            <tr key={slot.id || slot.order}>
                                <td colSpan={2 + (activeDays.length * classes.length)} className="border border-black bg-green-50 text-green-800 font-bold text-center py-0.5 text-[7px]">
                                    {slot.name || 'Istirahat'}
                                </td>
                            </tr>
                        );
                    }

                    return (
                        <tr key={slot.id || slot.order}>
                            <td className="border border-black text-center p-0.5 font-bold bg-gray-50">{slot.startTime}-{slot.endTime}</td>
                            <td className="border border-black text-center p-0.5 font-bold bg-gray-50">{slot.jp}</td>

                            {activeDays.map(dayNum => (
                                <React.Fragment key={dayNum}>
                                    {classes.map(cls => {
                                        const schedule = schedules.find(s =>
                                            Number(s.day) === dayNum &&
                                            Number(s.jp) === Number(slot.jp) &&
                                            (s.classes || []).includes(cls)
                                        );

                                        let content = '-';
                                        let cellClass = '';

                                        if (schedule && schedule.guru) {
                                            const info = codeMap.get(schedule.guru);
                                            if (info) {
                                                content = info.code;
                                                if (info.category === 'IT') cellClass = 'bg-[#d2b48c]';
                                                else if (info.category === 'Diniyah') cellClass = 'bg-[#90ee90]';
                                                else if (info.category === 'English') cellClass = 'bg-[#add8e6]';
                                                else if (info.category === 'BK') cellClass = 'bg-[#ffb6c1]';
                                                else cellClass = 'bg-white';
                                            } else {
                                                content = schedule.guru.substring(0, 3).toUpperCase();
                                                cellClass = 'bg-white';
                                            }
                                        }

                                        return (
                                            <td key={`${dayNum}-${cls}`} className={`border border-black text-center p-0.5 ${cellClass}`}>
                                                <strong className="text-[7px]">{content}</strong>
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
    );

    const renderLegend = (codeMap: TeacherCodeMap) => {
        const categories = ['IT', 'English', 'Diniyah', 'BK'];
        return (
            <div className="grid grid-cols-4 gap-2 mt-2 text-[7px] leading-tight">
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

                    let colorClass = '';
                    if (cat === 'IT') colorClass = 'bg-[#d2b48c]';
                    else if (cat === 'Diniyah') colorClass = 'bg-[#90ee90]';
                    else if (cat === 'English') colorClass = 'bg-[#add8e6]';
                    else if (cat === 'BK') colorClass = 'bg-[#ffb6c1]';
                    else colorClass = 'bg-white border border-black';

                    return (
                        <div key={cat} className="border-l border-gray-300 pl-2">
                            <h4 className="font-bold border-b border-gray-400 mb-0.5 uppercase">{cat}</h4>
                            <div className="flex flex-col gap-0">
                                {items.map(item => (
                                    <div key={item.code} className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 inline-block ${colorClass}`}></span>
                                        <strong>{item.code}:</strong> <span className="truncate">{item.teacher}</span>
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
    const hasSmk = smkClasses.length > 0;

    if (!hasSmp && !hasSmk) {
        return (
            <div className="w-full text-center py-10 text-muted-foreground">
                Tidak ada data jadwal untuk ditampilkan.
            </div>
        );
    }

    return (
        <div className="w-full">
            {hasSmp && (
                <>
                    <PrintLayout
                        title="JADWAL PELAJARAN GABUNGAN - SMP"
                        signatureSettings={signatureSettings || null}
                        infoLinks={infoLinks}
                        landscape={true}
                        showQr={showQr}
                    >
                        <div className="mb-4">
                            {renderTable('SMP', smpClasses, smpMap)}
                            {renderLegend(smpMap)}
                        </div>
                    </PrintLayout>

                    {hasSmk && <div className="page-break" />}
                </>
            )}

            {hasSmk && (
                <PrintLayout
                    title="JADWAL PELAJARAN GABUNGAN - SMK"
                    signatureSettings={signatureSettings || null}
                    infoLinks={infoLinks}
                    landscape={true}
                    showQr={showQr}
                >
                    <div>
                        {renderTable('SMK', smkClasses, smkMap)}
                        {renderLegend(smkMap)}
                    </div>
                </PrintLayout>
            )}
        </div>
    );
}
