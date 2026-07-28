import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';

import { useAuth } from '@/contexts/AuthContext';

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const { signInWithGoogle } = useAuth();
    const [loginError, setLoginError] = useState('');

    const handleLogin = async () => {
        setLoginError('');
        const result = await signInWithGoogle();
        if (result.success) {
            onOpenChange(false);
        } else if (result.error) {
            setLoginError(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] overflow-hidden p-0 rounded-3xl border-0 shadow-[0_25px_60px_rgba(0,0,0,0.12)]">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 pt-10 pb-12 text-center text-white overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-sm pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5 blur-md pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
                            <img src={logo} alt="Logo IDN" className="h-12 w-12 object-contain drop-shadow" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-white">Selamat Datang</DialogTitle>
                            <DialogDescription className="text-sm text-white/75 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                                Masuk untuk mengelola jadwal IDN Boarding School
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 py-7 space-y-5">
                    {loginError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm text-center py-2.5 px-3 rounded-xl">
                            {loginError}
                        </div>
                    )}

                    <Button
                        onClick={handleLogin}
                        className="w-full flex items-center justify-center gap-3 h-12 text-[15px] font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md rounded-xl"
                        size="lg"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Masuk dengan Google
                    </Button>

                    <div className="text-center">
                        <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
                            Khusus Pengelola & Admin
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
