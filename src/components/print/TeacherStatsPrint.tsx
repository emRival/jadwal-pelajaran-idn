import { SignatureSettings, InfoLink } from '@/types';
import { PrintLayout } from './PrintLayout';
import { TeacherStat } from '@/hooks/useTeacherStats';

interface TeacherStatsPrintProps {
    stats: TeacherStat[];
    signatureSettings: SignatureSettings | null;
    infoLinks: InfoLink[];
}

export function TeacherStatsPrint({ stats, signatureSettings, infoLinks }: TeacherStatsPrintProps) {
    return (
        <PrintLayout
            title="Statistik Beban Mengajar Guru"
            signatureSettings={signatureSettings}
            infoLinks={infoLinks}
            hideQr={true}
            hideSignatures={true}
            isMultiPage={true}
        >
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-6 no-print-break">
                <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Total Pendidik</span>
                    <div className="text-lg font-black text-slate-900 mt-1 leading-none">{stats.length} Guru</div>
                </div>
                <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Beban KBM</span>
                    <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                        {stats.reduce((acc, t) => acc + t.totalJp, 0)} JP
                    </div>
                </div>
                <div className="border border-slate-950 p-3 rounded-md bg-slate-50/50 text-center">
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold">Beban Tugas</span>
                    <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                        {stats.reduce((acc, t) => acc + t.taskJp, 0)} JP
                    </div>
                </div>
                <div className="border border-slate-950 p-3 rounded-md bg-slate-100/40 text-center">
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-600 font-bold">Rata-rata JP Mengajar</span>
                    <div className="text-lg font-black text-slate-900 mt-1 leading-none">
                        {(stats.reduce((acc, t) => acc + t.totalJp, 0) / (stats.length || 1)).toFixed(1)} JP
                    </div>
                </div>
            </div>

            <div className="border border-slate-950 overflow-hidden rounded-md">
                <table className="w-full text-[11px] leading-normal print-table border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                            <th className="border-r border-slate-950 p-2.5 font-bold text-left w-[22%]">Nama Guru</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Sen</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Sel</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Rab</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Kam</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[6%]">Jum</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[8%] bg-slate-50/50">KBM</th>
                            <th className="border-r border-slate-950 p-2 font-bold text-center w-[25%]">Tugas Tambahan</th>
                            <th className="p-2 font-bold text-center w-[15%] bg-slate-50/50">Total JP Mengajar & Grafik</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((teacher, index) => (
                            <tr
                                key={teacher.id}
                                className={`border-b last:border-b-0 border-slate-950 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                }`}
                            >
                                <td className="border-r border-slate-950 p-2 align-middle">
                                    <div className="font-bold text-slate-900">{teacher.name}</div>
                                    {teacher.schedules && teacher.schedules.length > 0 ? (
                                        <div className="text-[8px] text-slate-500 mt-1 space-y-0.5 font-medium leading-none">
                                            <div><span className="font-bold text-slate-700">Mapel:</span> {Array.from(new Set(teacher.schedules.map(s => s.mapel))).join(', ')}</div>
                                            <div><span className="font-bold text-slate-700">Kelas:</span> {Array.from(new Set(teacher.schedules.flatMap(s => s.classes || []))).join(', ')}</div>
                                        </div>
                                    ) : (
                                        <div className="text-[8px] text-slate-400 mt-1 italic">Tidak ada jadwal KBM</div>
                                    )}
                                </td>
                                {[1, 2, 3, 4, 5].map(day => (
                                    <td key={day} className="border-r border-slate-950 p-2 text-center font-mono align-middle text-slate-700">
                                        {teacher.byDay[day] || <span className="text-slate-300">-</span>}
                                    </td>
                                ))}
                                <td className="border-r border-slate-950 p-2 text-center font-mono font-bold bg-slate-50/20 align-middle text-slate-800">{teacher.totalJp}</td>
                                <td className="border-r border-slate-950 p-2 text-[9.5px] leading-tight align-middle">
                                    {teacher.tasks.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {teacher.tasks.map((task, i) => (
                                                <div key={i} className="flex justify-between items-center gap-2 border-b border-slate-950/5 last:border-0 pb-0.5 last:pb-0">
                                                    <span className="text-slate-600 font-medium text-[9px]">{task?.name}</span>
                                                    <span className="font-bold text-slate-700 text-[9px] bg-slate-100 px-1 py-0.5 rounded leading-none whitespace-nowrap">{task?.jp} JP</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-300 font-semibold">-</div>
                                    )}
                                </td>
                                <td className="p-2 align-middle bg-slate-50/20">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-extrabold text-slate-900">{teacher.totalJp} JP</span>
                                            <span className="text-[7.5px] font-bold text-slate-500">
                                                {Math.min(Math.round((teacher.totalJp / 24) * 100), 100)}% dari 24 JP
                                            </span>
                                        </div>
                                        {/* Micro visual progress bar */}
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-950/10">
                                            <div
                                                className={`h-full rounded-full ${
                                                    teacher.totalJp >= 24
                                                        ? 'bg-emerald-500'
                                                        : teacher.totalJp >= 16
                                                            ? 'bg-amber-500'
                                                            : 'bg-rose-500'
                                                }`}
                                                style={{ width: `${Math.min((teacher.totalJp / 24) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-[7.5px] font-bold mt-0.5">
                                            {teacher.totalJp >= 24 ? (
                                                <span className="text-emerald-600">Memenuhi (24 JP)</span>
                                            ) : (
                                                <span className={teacher.totalJp < 16 ? 'text-rose-600' : 'text-amber-600'}>
                                                    Belum memenuhi JP
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PrintLayout>
    );
}
