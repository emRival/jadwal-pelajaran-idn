import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Calculator,
    Link,
    Pen,
    Save,
    Loader2,
    ExternalLink
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useSignatureSettings, useJpCalculationMethod, usePiketApi, useInfoLinks } from '@/hooks/useFirebase';

export function Settings() {
    const { settings: signatureSettings, updateSettings: updateSignature, loading: sigLoading } = useSignatureSettings();
    const { method: jpMethod, updateMethod: updateJpMethod, loading: jpLoading } = useJpCalculationMethod();
    const { apiUrl: piketUrl, updateApiUrl: updatePiketUrl, loading: piketLoading } = usePiketApi();
    const { infoLinks, addInfoLink, deleteInfoLink, loading: linksLoading } = useInfoLinks();

    const [headName, setHeadName] = useState('');
    const [headUrl, setHeadUrl] = useState('');
    const [viceName, setViceName] = useState('');
    const [viceUrl, setViceUrl] = useState('');
    const [piketUrlInput, setPiketUrlInput] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [saving, setSaving] = useState(false);

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
                                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                                    >
                                        <div>
                                            <span className="font-medium">{link.title}</span>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline ml-2"
                                            >
                                                {link.url.substring(0, 40)}...
                                            </a>
                                        </div>
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
        </div>
    );
}
