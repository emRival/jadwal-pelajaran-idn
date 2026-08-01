import { Schedule, Teacher, Task, TimeSlot, SignatureSettings, InfoLink, DAYS_OF_WEEK_API } from '@/types';
import { PrintLayout } from './PrintLayout';
import { getDayName, getEntityColor, calculateTeacherJP } from '@/lib/scheduleUtils';

interface SingleSchedulePrintProps {
    entityType: 'class' | 'teacher';
    entityName: string;
    schedules: Schedule[];
    timeSlots: TimeSlot[];
    signatureSettings: SignatureSettings | null;
    infoLinks: InfoLink[];
    teachers: Teacher[];
    tasks: Task[];
    method: 'byClass' | 'bySession';
}

export function SingleSchedulePrint({
    entityType,
    entityName,
    schedules,
    timeSlots,
    signatureSettings,
    infoLinks,
    teachers,
    tasks,
    method
}: SingleSchedulePrintProps) {
    const hasSaturday = schedules.some(s =>
        Number(s.day) === 6 &&
        (entityType === 'class' ? (s.classes || []).includes(entityName) : s.guru === entityName)
    );
    const totalDays = hasSaturday ? 7 : 6;
    const cols = totalDays + 1; // Days + Jam + Waktu = total columns

    return (
        <PrintLayout
            title={entityType === 'class' ? `Jadwal Pelajaran Kelas ${entityName}` : `Jadwal Mengajar ${entityName}`}
            signatureSettings={signatureSettings}
            infoLinks={infoLinks}
            showQr={entityType === 'class'}
        >
            <div className="border border-slate-950 overflow-hidden rounded-md">
                <table className="w-full text-[12.5px] leading-normal print-table border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                            <th className="border-r border-slate-950 p-2 font-bold w-12 text-center">Jam</th>
                            <th className="border-r border-slate-950 p-2 font-bold w-20 text-center">Waktu</th>
                            {DAYS_OF_WEEK_API.slice(1, totalDays).map((day, idx) => (
                                <th key={day} className="border-r last:border-r-0 border-slate-950 p-2 font-bold uppercase text-center">{getDayName(idx + 1)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.filter(slot => slot.dayType !== 'saturday').sort((a, b) => a.order - b.order).map(slot => {
                            if (slot.type === 'break') {
                                return (
                                    <tr key={slot.id} className="border-b border-slate-950 bg-emerald-50/50">
                                        <td colSpan={cols} className="text-center font-bold py-1.5 text-[11.5px] text-emerald-800 tracking-wide">{slot.name}</td>
                                    </tr>
                                )
                            }
                            return (
                                <tr key={slot.id} className="border-b last:border-b-0 border-slate-950">
                                    <td className="border-r border-slate-950 text-center p-2 font-semibold bg-slate-50/40">{slot.jp}</td>
                                    <td className="border-r border-slate-950 text-center p-2 font-mono text-[11px] bg-slate-50/20">{slot.startTime}-{slot.endTime}</td>
                                    {DAYS_OF_WEEK_API.slice(1, totalDays).map((_, dayIdx) => {
                                        const dayNum = dayIdx + 1;
                                        const schedule = schedules.find(s =>
                                            Number(s.day) === dayNum &&
                                            Number(s.jp) === Number(slot.jp) &&
                                            (entityType === 'class' ? (s.classes || []).includes(entityName) : s.guru === entityName)
                                        );

                                        const cellColor = schedule
                                            ? getEntityColor(
                                                entityType === 'class' ? schedule.guru : schedule.mapel,
                                                entityType === 'class' ? 'teacher' : 'subject'
                                            )
                                            : undefined;

                                        return (
                                            <td
                                                key={dayNum}
                                                className="border-r last:border-r-0 border-slate-950 text-center p-2 align-middle"
                                                style={cellColor ? { backgroundColor: cellColor } : undefined}
                                            >
                                                {schedule ? (
                                                    <div className="space-y-1.5">
                                                        <div className="font-bold text-slate-900 leading-normal">{schedule.mapel}</div>
                                                        <div className="text-[12px] text-slate-700 font-semibold">{entityType === 'class' ? schedule.guru : (schedule.classes || []).join(', ')}</div>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {entityType === 'teacher' && (
                <div className="mt-4 border border-slate-950 p-3 text-[10px] rounded-md">
                    <h3 className="font-bold border-b border-slate-950 mb-2 pb-1.5 uppercase tracking-wide text-slate-800">Detail Beban Mengajar & Tugas</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="py-1">Beban Mengajar</td>
                                        <td className="py-1 text-right font-bold">{calculateTeacherJP(entityName, schedules, method)} JP</td>
                                    </tr>
                                    {(() => {
                                        const teacher = teachers.find(t => t.name === entityName);
                                        const teacherTasks = teacher?.tasks?.map(taskId => tasks.find(t => t.id === taskId)).filter(Boolean) || [];
                                        const taskJp = teacherTasks.reduce((acc, t) => acc + (t?.jp || 0), 0);
                                        const grandTotal = calculateTeacherJP(entityName, schedules, method) + taskJp;

                                        return (
                                            <>
                                                {teacherTasks.map((task, i) => (
                                                    <tr key={i} className="text-muted-foreground">
                                                        <td className="py-0.5 pr-2">• {task?.name}</td>
                                                        <td className="py-0.5 text-right">{task?.jp} JP</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-slate-950 font-bold">
                                                    <td className="py-1">Total Beban Tugas</td>
                                                    <td className="py-1 text-right">{grandTotal} JP</td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-[9px] italic text-muted-foreground flex items-end justify-end">
                            * 1 JP = {timeSlots.find(s => s.type === 'lesson')?.startTime && timeSlots.find(s => s.type === 'lesson')?.endTime ?
                                (parseInt(timeSlots.find(s => s.type === 'lesson')!.endTime.split(':')[0]) * 60 + parseInt(timeSlots.find(s => s.type === 'lesson')!.endTime.split(':')[1])) -
                                (parseInt(timeSlots.find(s => s.type === 'lesson')!.startTime.split(':')[0]) * 60 + parseInt(timeSlots.find(s => s.type === 'lesson')!.startTime.split(':')[1]))
                                : 45} Menit
                        </div>
                    </div>
                </div>
            )}
        </PrintLayout>
    );
}
