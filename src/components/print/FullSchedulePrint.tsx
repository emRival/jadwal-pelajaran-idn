import React, { useMemo } from 'react';
import { Schedule, TimeSlot } from '@/types';
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
    // 1. Strict Prefix Check
    // Expected format: "CATEGORY - Subject Name"
    const parts = mapel.split('-');
    if (parts.length > 1) {
        const prefix = parts[0].trim().toUpperCase();
        if (prefix === 'IT') return 'IT';
        if (prefix === 'ENGLISH' || prefix === 'INGGRIS') return 'English';
        if (prefix === 'DINIYAH' || prefix === 'PAI' || prefix === 'ADAB') return 'Diniyah';
        if (prefix === 'BK') return 'BK';
    }

    // 2. Fallback Keyword Check (for legacy data without prefix)
    const lower = mapel.toLowerCase();
    if (lower.includes('english') || lower.includes('inggris')) return 'English';
    if (lower.includes('diniyah') || lower.includes('pai') || lower.includes('qur') || lower.includes('hadits') || lower.includes('fiqih') || lower.includes('akidah') || lower.includes('arab')) return 'Diniyah';
    if (lower.includes('bk') || lower.includes('konseling')) return 'BK';

    // 3. Default catch-all -> IT
    return 'IT';
}

function generateCodeMaps(schedules: Schedule[]) {
    // Only 4 categories now. 'Lainnya' is gone.
    const smpTeachers = { IT: new Set<string>(), Diniyah: new Set<string>(), English: new Set<string>(), BK: new Set<string>() };
    const smkTeachers = { IT: new Set<string>(), Diniyah: new Set<string>(), English: new Set<string>(), BK: new Set<string>() };

    schedules.forEach(s => {
        if (!s.guru || !s.classes || s.classes.length === 0) return;

        const category = getSubjectCategory(s.mapel);

        // Determine level based on first class
        const className = s.classes[0];
        const grade = parseInt(className.match(/^\d+/)?.[0] || '0');

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

    // Ensure strict typing for classes
    const smpClasses = ['7', '8A', '8B', '9'];
    const smkClasses = ['10 RPL', '10 DKV', '10 TKJ', '11 RPL', '11 DKV', '11 TKJ'];
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

    const renderTable = (level: 'SMP' | 'SMK', classes: string[], codeMap: TeacherCodeMap) => (
        <table className="w-full border-collapse text-[6px] table-fixed print-table">
            <thead>
                <tr>
                    <th rowSpan={2} className="w-[5%] border border-black bg-gray-100 p-1">Jam/Waktu</th>
                    <th rowSpan={2} className="w-[2%] border border-black bg-gray-100 p-1">Ke</th>
                    {days.map(day => (
                        <th key={day} colSpan={classes.length} className="border border-black bg-gray-100 p-1 font-bold uppercase">{day}</th>
                    ))}
                </tr>
                <tr>
                    {days.map(day => (
                        <React.Fragment key={day + '-sub'}>
                            {classes.map(cls => (
                                <th key={day + cls} className={`border border-black p-0.5 text-center font-bold text-[6px] ${level === 'SMK' ? (cls.startsWith('10') ? 'bg-blue-50' : 'bg-green-50') : 'bg-gray-200'}`}>
                                    {cls}
                                </th>
                            ))}
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {timeSlots.sort((a, b) => a.order - b.order).map(slot => {
                    const isBreak = slot.type === 'break';
                    if (isBreak) {
                        return (
                            <tr key={slot.id || slot.order}>
                                <td colSpan={2 + (days.length * classes.length)} className="border border-black bg-green-50 text-green-800 font-bold text-center py-0.5 text-[7px]">
                                    {slot.name || 'Istirahat'}
                                </td>
                            </tr>
                        );
                    }

                    return (
                        <tr key={slot.id || slot.order}>
                            <td className="border border-black text-center p-0.5 font-bold bg-gray-50">{slot.startTime}-{slot.endTime}</td>
                            <td className="border border-black text-center p-0.5 font-bold bg-gray-50">{slot.jp}</td>

                            {days.map((_, dayIndex) => { // dayIndex 0 = Senin (Day 1 in DB)
                                const currentDay = dayIndex + 1;
                                return (
                                    <React.Fragment key={currentDay}>
                                        {classes.map(cls => {
                                            const schedule = schedules.find(s =>
                                                Number(s.day) === currentDay &&
                                                Number(s.jp) === Number(slot.jp) &&
                                                (s.classes || []).includes(cls)
                                            );

                                            let content = '-';
                                            let cellClass = '';

                                            if (schedule && schedule.guru) {
                                                const info = codeMap.get(schedule.guru);
                                                if (info) {
                                                    content = info.code;
                                                    // Color coding
                                                    if (info.category === 'IT') cellClass = 'bg-[#d2b48c]'; // tan
                                                    else if (info.category === 'Diniyah') cellClass = 'bg-[#90ee90]'; // lightgreen
                                                    else if (info.category === 'English') cellClass = 'bg-[#add8e6]'; // lightblue
                                                    else if (info.category === 'BK') cellClass = 'bg-[#ffb6c1]'; // lightpink
                                                    else cellClass = 'bg-white'; // Lainnya/Default
                                                } else {
                                                    // Fallback if teacher not in map but exists in schedule (should be rare now)
                                                    content = schedule.guru.substring(0, 3).toUpperCase();
                                                    cellClass = 'bg-white';
                                                }
                                            }

                                            return (
                                                <td key={`${currentDay}-${cls}`} className={`border border-black text-center p-0.5 ${cellClass}`}>
                                                    <strong className="text-[7px]">{content}</strong>
                                                </td>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
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
                    {renderTable('SMP', smpClasses, smpMap)}
                    {renderLegend(smpMap)}
                </div>
            </PrintLayout>

            <div className="page-break" />

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
        </div>
    );
}
