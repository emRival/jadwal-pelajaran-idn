import React from 'react';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';
import { SignatureSettings, InfoLink } from '@/types';

interface PrintLayoutProps {
    title: string;
    signatureSettings: SignatureSettings | null;
    infoLinks: InfoLink[];
    children: React.ReactNode;
    landscape?: boolean;
    hideQr?: boolean;
    hideSignatures?: boolean;
    showQr?: boolean;
    isMultiPage?: boolean;
}

export function PrintLayout({
    title,
    signatureSettings,
    infoLinks,
    children,
    landscape = false,
    hideQr = false,
    hideSignatures = false,
    showQr = true,
    isMultiPage = false
}: PrintLayoutProps) {
    const currentDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    let subtitleType = "JADWAL PELAJARAN & MENGAJAR";
    let entityName = title;

    if (title.startsWith("Jadwal Pelajaran Kelas ")) {
        subtitleType = "JADWAL PELAJARAN KELAS";
        entityName = title.replace("Jadwal Pelajaran Kelas ", "");
    } else if (title.startsWith("Jadwal Mengajar ")) {
        subtitleType = "JADWAL MENGAJAR GURU";
        entityName = title.replace("Jadwal Mengajar ", "");
    }

    return (
        <div className={`print-container ${landscape ? 'landscape' : ''} ${isMultiPage ? 'multipage' : ''} bg-white text-black p-2 md:p-4 font-sans relative`}>
            {/* Watermark */}
            <p
                className="watermark-overlay pointer-events-none select-none fixed text-right"
                style={{ bottom: '5px', right: '5px', fontSize: '7.5px', color: 'rgba(0,0,0,0.1)', fontWeight: 'bold' }}
            >
                Jadwal Pelajaran IDN Pamijahan by Muhammad Rival, S.Kom
            </p>

            {/* Kop Surat (School Letterhead) */}
            <div className="flex items-center gap-4 border-b-4 border-double border-slate-900 pb-3 mb-4 print-header">
                <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
                <div className="flex-1 text-center pr-16">
                    <h1 className="text-lg font-extrabold tracking-wide text-slate-950 uppercase leading-none">IDN Boarding School Pamijahan</h1>
                    <p className="text-[9px] text-slate-600 mt-1.5 leading-tight">
                        Jl. KH. Abdul Hamid, Desa Gunung Sari, Kec. Pamijahan, Kabupaten Bogor, Jawa Barat.
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5 leading-none">
                        Website: idn.sch.id | Email: info@idn.sch.id
                    </p>
                </div>
            </div>

            {/* Document Title Block */}
            <div className="text-center mb-5 space-y-1">
                <h3 className="text-[11px] font-extrabold tracking-widest text-slate-700 uppercase">{subtitleType}</h3>
                <h2 className="text-base font-black tracking-wide text-slate-950 uppercase leading-normal max-w-xl mx-auto">{entityName}</h2>
                <div className="w-16 h-0.5 bg-slate-950/20 mx-auto mt-1 rounded-full" />
                <p className="text-[8px] text-slate-500 font-medium">Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear() + 1} | Dicetak: {currentDate}</p>
            </div>

            {/* Content */}
            <div>
                {children}
            </div>

            {/* Footer Section */}
            <div className="break-inside-avoid">
                {/* Signatures */}
                {signatureSettings && !hideSignatures && (
                    <div className="flex justify-around items-end mt-12 mb-2 pt-2 signature-section">
                        {/* Vice Head */}
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] uppercase mb-2">Wakil Kepala (Kurikulum)</p>
                            <div className="relative h-20 mb-2 flex items-center justify-center">
                                {signatureSettings.viceUrl && (
                                    <img
                                        src={signatureSettings.viceUrl}
                                        alt="TTD"
                                        className="max-h-20 max-w-[160px] object-contain absolute"
                                    />
                                )}
                            </div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">{signatureSettings.viceName || '________________'}</p>
                        </div>

                        {/* Head Master */}
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] uppercase mb-2">Kepala Unit</p>
                            <div className="relative h-20 mb-2 flex items-center justify-center">
                                {signatureSettings.headUrl && (
                                    <img
                                        src={signatureSettings.headUrl}
                                        alt="TTD"
                                        className="max-h-20 max-w-[160px] object-contain absolute"
                                    />
                                )}
                            </div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">{signatureSettings.headName || '________________'}</p>
                        </div>
                    </div>
                )}

                {/* QR Codes */}
                {!hideQr && showQr && infoLinks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 qr-section">
                        <h4 className="font-bold mb-1.5 text-[8px] text-center uppercase tracking-wider text-slate-700">Informasi Penting (Scan QR Code)</h4>
                        <div className="flex flex-wrap gap-4 justify-center">
                            {infoLinks.map(link => (
                                <div key={link.id} className="text-center w-16">
                                    <div className="bg-white p-0.5 inline-block mb-0.5">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(link.url)}`}
                                            className="w-10 h-10 border border-black"
                                            alt={link.title}
                                        />
                                    </div>
                                    <p className="text-[7px] font-semibold leading-tight text-slate-700">{link.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
