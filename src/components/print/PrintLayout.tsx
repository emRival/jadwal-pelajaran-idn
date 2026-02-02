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
}

export function PrintLayout({
    title,
    signatureSettings,
    infoLinks,
    children,
    landscape = false,
    hideQr = false,
    hideSignatures = false,
    showQr = true
}: PrintLayoutProps) {
    const currentDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className={`print-container ${landscape ? 'landscape' : ''} bg-white text-black p-2 md:p-4 font-sans`}>
            {/* Header */}
            <div className="border-b-[2px] border-black pb-2 mb-3 print-header flex items-center justify-between">
                <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
                <div className="flex-1 text-center">
                    <h2 className="text-xl font-bold uppercase tracking-wide">{title}</h2>
                    <h3 className="text-lg font-bold uppercase tracking-wide">IDN Boarding School Pamijahan</h3>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">Dicetak pada: {currentDate}</p>
                </div>
                <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div>
                {children}
            </div>

            {/* Footer Section */}
            <div className="break-inside-avoid">
                {/* Signatures */}
                {signatureSettings && !hideSignatures && (
                    <div className="flex justify-around items-end mt-4 mb-2 pt-2">
                        {/* Vice Head */}
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] mb-10 uppercase">Wakil Kepala (Kurikulum)</p>
                            <div className="relative h-14 mb-1 flex items-end justify-center">
                                {signatureSettings.viceUrl && (
                                    <img
                                        src={signatureSettings.viceUrl}
                                        alt="TTD"
                                        className="max-h-14 max-w-[120px] object-contain absolute bottom-0"
                                    />
                                )}
                            </div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">{signatureSettings.viceName || '________________'}</p>
                        </div>

                        {/* Head Master */}
                        <div className="text-center w-1/3">
                            <p className="font-bold text-[10px] mb-10 uppercase">Kepala Unit</p>
                            <div className="relative h-14 mb-1 flex items-end justify-center">
                                {signatureSettings.headUrl && (
                                    <img
                                        src={signatureSettings.headUrl}
                                        alt="TTD"
                                        className="max-h-14 max-w-[120px] object-contain absolute bottom-0"
                                    />
                                )}
                            </div>
                            <p className="font-bold text-[10px] border-t border-black pt-1">{signatureSettings.headName || '________________'}</p>
                        </div>
                    </div>
                )}

                {/* QR Codes */}
                {!hideQr && showQr && infoLinks.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <h4 className="font-bold mb-4 text-[10px] text-center uppercase tracking-wider">Informasi Penting (Scan QR Code)</h4>
                        <div className="flex flex-wrap gap-6 justify-center">
                            {infoLinks.map(link => (
                                <div key={link.id} className="text-center w-20">
                                    <div className="bg-white p-1 inline-block mb-1">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link.url)}`}
                                            className="w-16 h-16 border border-black"
                                            alt={link.title}
                                        />
                                    </div>
                                    <p className="text-[8px] font-semibold leading-tight">{link.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
