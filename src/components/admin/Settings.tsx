import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calculator,
    Link,
    Pen,
    Save,
    Loader2,
    ExternalLink,
    Database,
    Download,
    Upload
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { db, getDbPath } from '@/lib/firebase';
import { collection, getDocs, getDoc, setDoc, writeBatch, doc } from 'firebase/firestore';
import { useSignatureSettings, useJpCalculationMethod, usePiketApi, useInfoLinks } from '@/hooks/useFirebase';

export function Settings() {
    const { settings: signatureSettings, updateSettings: updateSignature, loading: sigLoading } = useSignatureSettings();
    const { method: jpMethod, updateMethod: updateJpMethod, loading: jpLoading } = useJpCalculationMethod();
    const { apiUrl: piketUrl, updateApiUrl: updatePiketUrl, loading: piketLoading } = usePiketApi();
    const { infoLinks, addInfoLink, updateInfoLink, deleteInfoLink, loading: linksLoading } = useInfoLinks();

    const [headName, setHeadName] = useState('');
    const [headUrl, setHeadUrl] = useState('');
    const [viceName, setViceName] = useState('');
    const [viceUrl, setViceUrl] = useState('');
    const [piketUrlInput, setPiketUrlInput] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);

    const handleBackup = async () => {
        setBackingUp(true);
        try {
            const getCollectionData = async (name: string) => {
                const snapshot = await getDocs(collection(db, getDbPath(name)));
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            };

            const schedules = await getCollectionData('schedules');
            const guru = await getCollectionData('guru');
            const kelas = await getCollectionData('kelas');
            const mapel = await getCollectionData('mapel');
            const tugas = await getCollectionData('tugas');
            const timeSlots = await getCollectionData('timeSlots');
            const infoLinks = await getCollectionData('infoLinks');

            const getConfigDoc = async (docName: string) => {
                const docSnap = await getDoc(doc(db, getDbPath('config'), docName));
                return docSnap.exists() ? docSnap.data() : null;
            };

            const config = {
                signatures: await getConfigDoc('signatures'),
                jpCalculation: await getConfigDoc('jpCalculation'),
                piketApi: await getConfigDoc('piketApi')
            };

            const backupData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                data: {
                    schedules,
                    guru,
                    kelas,
                    mapel,
                    tugas,
                    timeSlots,
                    infoLinks,
                    config
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `backup-jadwal-${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        } catch (error) {
            console.error('Failed to create backup:', error);
            alert('Gagal membuat backup data');
        } finally {
            setBackingUp(false);
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedRestoreFile(file);
        setShowRestoreConfirm(true);
        e.target.value = '';
    };

    const proceedRestore = async () => {
        if (!selectedRestoreFile) return;
        setRestoring(true);
        setShowRestoreConfirm(false);
        try {
            const fileReader = new FileReader();
            fileReader.onload = async (event) => {
                try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (!parsed.version || !parsed.data) {
                        throw new Error('Format file backup tidak valid');
                    }

                    const { schedules, guru, kelas, mapel, tugas, timeSlots, infoLinks, config } = parsed.data;

                    const collectionsToClear = ['schedules', 'guru', 'kelas', 'mapel', 'tugas', 'timeSlots', 'infoLinks'];
                    for (const col of collectionsToClear) {
                        const snapshot = await getDocs(collection(db, getDbPath(col)));
                        const batch = writeBatch(db);
                        snapshot.docs.forEach((doc) => {
                            batch.delete(doc.ref);
                        });
                        await batch.commit();
                    }

                    const restoreCol = async (colName: string, items: any[]) => {
                        if (!items || items.length === 0) return;
                        const chunkSize = 400;
                        for (let i = 0; i < items.length; i += chunkSize) {
                            const chunk = items.slice(i, i + chunkSize);
                            const batch = writeBatch(db);
                            chunk.forEach((item) => {
                                const docRef = item.id
                                    ? doc(db, getDbPath(colName), item.id)
                                    : doc(collection(db, getDbPath(colName)));
                                const data = { ...item };
                                delete data.id;
                                batch.set(docRef, data);
                            });
                            await batch.commit();
                        }
                    };

                    await restoreCol('schedules', schedules);
                    await restoreCol('guru', guru);
                    await restoreCol('kelas', kelas);
                    await restoreCol('mapel', mapel);
                    await restoreCol('tugas', tugas);
                    await restoreCol('timeSlots', timeSlots);
                    await restoreCol('infoLinks', infoLinks);

                    if (config) {
                        if (config.signatures) {
                            await setDoc(doc(db, getDbPath('config'), 'signatures'), config.signatures);
                        }
                        if (config.jpCalculation) {
                            await setDoc(doc(db, getDbPath('config'), 'jpCalculation'), config.jpCalculation);
                        }
                        if (config.piketApi) {
                            await setDoc(doc(db, getDbPath('config'), 'piketApi'), config.piketApi);
                        }
                    }

                    alert('Data berhasil dipulihkan!');
                    window.location.reload();
                } catch (err: any) {
                    console.error(err);
                    alert('Gagal mengimpor file: ' + err.message);
                } finally {
                    setRestoring(false);
                    setSelectedRestoreFile(null);
                }
            };
            fileReader.readAsText(selectedRestoreFile);
        } catch (error) {
            console.error('Failed to restore backup:', error);
            alert('Gagal memproses file restore');
            setRestoring(false);
            setSelectedRestoreFile(null);
        }
    };

    // Initialize form values when data loads
    useEffect(() => {
        if (signatureSettings.headName) {
            setHeadName(signatureSettings.headName);
            setHeadUrl(signatureSettings.headUrl);
            setViceName(signatureSettings.viceName);
            setViceUrl(signatureSettings.viceUrl);
        }
        if (piketUrl) {
            setPiketUrlInput(piketUrl);
        }
    }, [signatureSettings, piketUrl]);

    const handleSaveSignature = async () => {
        setSaving(true);
        await updateSignature({
            headName,
            headUrl,
            viceName,
            viceUrl
        });
        setSaving(false);
    };

    const handleSavePiketUrl = async () => {
        setSaving(true);
        await updatePiketUrl(piketUrlInput);
        setSaving(false);
    };

    const handleAddInfoLink = async () => {
        if (!newLinkTitle || !newLinkUrl) return;
        await addInfoLink({ title: newLinkTitle, url: newLinkUrl });
        setNewLinkTitle('');
        setNewLinkUrl('');
    };

    const loading = sigLoading || jpLoading || piketLoading || linksLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* JP Calculation Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Metode Perhitungan JP
                    </CardTitle>
                    <CardDescription>
                        Pilih bagaimana JP guru dihitung untuk statistik
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Select value={jpMethod} onValueChange={updateJpMethod}>
                            <SelectTrigger className="w-full sm:w-[300px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="byClass">Per Kelas (1 jadwal dengan 3 kelas = 3 JP)</SelectItem>
                                <SelectItem value="bySession">Per Sesi (1 jadwal dengan 3 kelas = 1 JP)</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                            <strong>Per Kelas:</strong> Menghitung JP berdasarkan jumlah kelas yang diajar dalam satu sesi.
                            <br />
                            <strong>Per Sesi:</strong> Menghitung JP berdasarkan jumlah sesi mengajar, tidak peduli berapa kelas.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Signature Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pen className="h-5 w-5" />
                        Pengaturan Tanda Tangan
                    </CardTitle>
                    <CardDescription>
                        Konfigurasi tanda tangan untuk cetak jadwal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-medium">Kepala Sekolah</h4>
                            <div className="space-y-2">
                                <Label>Nama</Label>
                                <Input
                                    placeholder="Nama Kepala Sekolah"
                                    value={headName}
                                    onChange={(e) => setHeadName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL Tanda Tangan (gambar)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={headUrl}
                                    onChange={(e) => setHeadUrl(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-medium">Wakil Kepala Sekolah</h4>
                            <div className="space-y-2">
                                <Label>Nama</Label>
                                <Input
                                    placeholder="Nama Wakil Kepala Sekolah"
                                    value={viceName}
                                    onChange={(e) => setViceName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL Tanda Tangan (gambar)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={viceUrl}
                                    onChange={(e) => setViceUrl(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleSaveSignature} className="mt-4" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Simpan Tanda Tangan
                    </Button>
                </CardContent>
            </Card>

            {/* Piket API */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        API Piket
                    </CardTitle>
                    <CardDescription>
                        URL API untuk integrasi data piket guru
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="https://script.google.com/..."
                            value={piketUrlInput}
                            onChange={(e) => setPiketUrlInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={handleSavePiketUrl} disabled={saving}>
                            <Save className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5" />
                        Link Informasi
                    </CardTitle>
                    <CardDescription>
                        Link cepat yang ditampilkan di halaman utama
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Existing Links */}
                        {infoLinks.length > 0 && (
                            <div className="space-y-2">
                                {infoLinks.map((link, index) => (
                                    <motion.div
                                        key={link.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-muted rounded-md"
                                    >
                                        <Input
                                            placeholder="Judul"
                                            defaultValue={link.title}
                                            onBlur={(e) => {
                                                if (e.target.value !== link.title) {
                                                    updateInfoLink(link.id, { title: e.target.value });
                                                }
                                            }}
                                            className="font-medium flex-1 min-w-0"
                                        />
                                        <Input
                                            placeholder="URL"
                                            defaultValue={link.url}
                                            onBlur={(e) => {
                                                if (e.target.value !== link.url) {
                                                    updateInfoLink(link.id, { url: e.target.value });
                                                }
                                            }}
                                            className="text-sm flex-[2] min-w-0"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteInfoLink(link.id)}
                                        >
                                            Hapus
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Add New Link */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="Judul link"
                                value={newLinkTitle}
                                onChange={(e) => setNewLinkTitle(e.target.value)}
                            />
                            <Input
                                placeholder="URL"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                            />
                            <Button onClick={handleAddInfoLink} disabled={!newLinkTitle || !newLinkUrl}>
                                Tambah
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Backup & Restore Data */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Backup & Restore Data
                    </CardTitle>
                    <CardDescription>
                        Ekspor seluruh data jadwal dan pengaturan ke file JSON, atau pulihkan dari file cadangan sebelumnya.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 p-4 border rounded-xl space-y-3 bg-muted/20">
                            <h3 className="font-bold text-sm">Cadangkan Data (Backup)</h3>
                            <p className="text-xs text-muted-foreground">
                                Mengunduh seluruh data guru, kelas, mata pelajaran, jadwal, dan pengaturan ke file JSON.
                            </p>
                            <Button
                                onClick={handleBackup}
                                disabled={backingUp}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Ekspor ke JSON
                            </Button>
                        </div>

                        <div className="flex-1 p-4 border rounded-xl space-y-3 bg-muted/20">
                            <h3 className="font-bold text-sm text-destructive">Pulihkan Data (Restore)</h3>
                            <p className="text-xs text-muted-foreground">
                                Mengunggah file JSON backup untuk menimpa seluruh data jadwal dan pengaturan saat ini.
                            </p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".json"
                                    id="restore-file-upload"
                                    className="hidden"
                                    onChange={handleRestore}
                                    disabled={restoring}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('restore-file-upload')?.click()}
                                    disabled={restoring}
                                    className="w-full flex items-center justify-center gap-2 border-destructive hover:bg-destructive/5 dark:hover:bg-destructive/10 text-destructive font-medium"
                                >
                                    {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    Impor dari JSON
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            Peringatan Pemulihan Data
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground block">
                                Tindakan ini akan menghapus seluruh data jadwal pelajaran, guru, kelas, mata pelajaran, istirahat, dan pengaturan saat ini.
                            </span>
                            <span className="block mt-2">
                                Data tersebut akan digantikan sepenuhnya oleh data yang ada pada file cadangan (JSON). Pastikan file cadangan Anda valid. Tindakan ini tidak dapat dibatalkan.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedRestoreFile(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={proceedRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Ya, Pulihkan Sekarang
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
