import { motion } from 'framer-motion';
import { Schedule, TimeSlot, DAYS_OF_WEEK_API } from '@/types';
import { getDayName, getEntityColor } from '@/lib/scheduleUtils';

interface WeeklyGridViewProps {
    entityName: string;
    entityType: 'class' | 'teacher';
    schedules: Schedule[];
    timeSlots: TimeSlot[];
}

export function WeeklyGridView({ entityName, entityType, schedules, timeSlots }: WeeklyGridViewProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse schedule-grid">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-10 bg-muted min-w-[100px]">Waktu</th>
                        {DAYS_OF_WEEK_API.slice(1, 6).map((_, idx) => (
                            <th key={idx}>
                                <div className="py-1 uppercase font-bold text-white">
                                    {getDayName(idx + 1)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.sort((a, b) => a.order - b.order).map(slot => {
                        if (slot.type === 'break') {
                            return (
                                <tr key={slot.id || slot.order}>
                                    <td className="sticky left-0 z-10 bg-muted font-bold text-center">
                                        {slot.startTime}
                                    </td>
                                    <td colSpan={5} className="border border-black bg-green-50 text-green-800 font-bold text-center py-2 h-12">
                                        {slot.name || 'Istirahat'}
                                    </td>
                                </tr>
                            );
                        }

                        return (
                            <tr key={slot.id || slot.order}>
                                <td className="sticky left-0 z-10 bg-background font-medium text-center">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">JP {slot.jp}</span>
                                        <span className="text-[10px] text-muted-foreground">{slot.startTime}-{slot.endTime}</span>
                                    </div>
                                </td>
                                {DAYS_OF_WEEK_API.slice(1, 6).map((_, dayIdx) => {
                                    const dayNum = dayIdx + 1;
                                    const schedule = schedules.find(s =>
                                        Number(s.day) === dayNum &&
                                        Number(s.jp) === Number(slot.jp) &&
                                        (entityType === 'class' ? s.classes?.includes(entityName) : s.guru === entityName)
                                    );

                                    return (
                                        <td key={dayNum} className="p-1 min-h-[60px]">
                                            {schedule ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="p-2 rounded-lg shadow-sm border h-full flex flex-col justify-center"
                                                    style={{
                                                        backgroundColor: getEntityColor(
                                                            entityType === 'class' ? schedule.guru : schedule.mapel,
                                                            entityType === 'class' ? 'teacher' : 'subject'
                                                        ),
                                                        borderColor: 'rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <div className="font-bold text-sm text-slate-800 leading-tight">{schedule.mapel}</div>
                                                    <div className="text-[10px] text-slate-600 mt-1">
                                                        {entityType === 'class' ? schedule.guru : schedule.classes?.join(', ')}
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-200">—</div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
