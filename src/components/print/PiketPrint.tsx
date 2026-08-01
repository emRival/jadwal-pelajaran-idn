import { DAYS_OF_WEEK_API, DAYS_OF_WEEK } from '@/types';
// @ts-expect-error - PNG module has no type declarations
import logo from '@/assets/apple-icon-180x180.png';
import { PiketData } from '@/hooks/usePiketData';
import { PIKET_TYPES } from '@/lib/piketTypes';

interface PiketPrintProps {
    data: PiketData;
}

export function PiketPrint({ data }: PiketPrintProps) {
    return (
        <div>
            <div className="flex items-center gap-4 border-b-4 border-double border-slate-900 pb-3 mb-4">
                <img src={logo} alt="Logo" className="h-14 w-14 object-contain" />
                <div className="flex-1 text-center pr-12">
                    <h1 className="text-base font-extrabold tracking-wide text-slate-950 uppercase leading-none">IDN Boarding School Pamijahan</h1>
                    <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                        Jl. KH. Abdul Hamid, Desa Gunung Sari, Kec. Pamijahan, Kabupaten Bogor, Jawa Barat.
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5 leading-none">
                        Website: idn.sch.id | Email: info@idn.sch.id
                    </p>
                </div>
            </div>
            <div className="text-center mb-4 space-y-1">
                <h3 className="text-[11px] font-extrabold tracking-widest text-slate-700 uppercase">Jadwal Piket Guru</h3>
                <p className="text-[8px] text-slate-500 font-medium">Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear() + 1} | Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <table className="w-full text-[10px] leading-normal border-collapse">
                <thead>
                    <tr className="bg-slate-100 text-slate-900">
                        <th className="border border-slate-900 p-1.5 font-bold text-left w-28">Jenis Piket</th>
                        {DAYS_OF_WEEK.slice(1, 6).map((day) => (
                            <th key={day} className="border border-slate-900 p-1.5 font-bold text-center uppercase">{day}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {PIKET_TYPES.map((type) => {
                        const categoryData = data.data[type.key as keyof typeof data.data];
                        return (
                            <tr key={type.key}>
                                <td className="border border-slate-900 p-1.5 font-semibold bg-slate-50">{type.title}</td>
                                {DAYS_OF_WEEK_API.slice(1, 6).map((day) => {
                                    const dayInfo = categoryData ? categoryData[day] : null;
                                    return (
                                        <td key={day} className="border border-slate-900 p-1.5 text-center align-top">
                                            {dayInfo ? (
                                                dayInfo.status === 'puasa' ? (
                                                    <span className="text-slate-400 italic">Puasa</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-0.5 justify-center">
                                                        {dayInfo.guru && dayInfo.guru.length > 0 ? (
                                                            dayInfo.guru.map((guru, gIdx) => (
                                                                <span key={gIdx} className="inline-block px-1 py-0 rounded bg-slate-100 text-[9px]">{guru}</span>
                                                            ))
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="flex justify-around items-end mt-10 pt-2">
                <div className="text-center w-1/3">
                    <p className="font-bold text-[10px] uppercase mb-1">Wakil Kepala (Kurikulum)</p>
                    <div className="h-16 mb-1"></div>
                    <p className="font-bold text-[10px] border-t border-black pt-1">________________</p>
                </div>
                <div className="text-center w-1/3">
                    <p className="font-bold text-[10px] uppercase mb-1">Kepala Unit</p>
                    <div className="h-16 mb-1"></div>
                    <p className="font-bold text-[10px] border-t border-black pt-1">________________</p>
                </div>
            </div>
        </div>
    );
}
