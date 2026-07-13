import { motion } from 'framer-motion';
import {
    Menu,
    X,
    Moon,
    Sun,
    LogOut,
    User,
    Settings,
    ChevronDown,
    Download
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

export function Header({ darkMode, toggleDarkMode }: HeaderProps) {
    const { user, isAdmin, signInWithGoogle, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsAppInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsAppInstalled(true);
        }
        setDeferredPrompt(null);
    };

    const navItems = [
        { id: 'schedule', label: 'Jadwal', path: '/' },
        { id: 'teachers', label: 'Statistik Guru', path: '/teachers' },
        { id: 'conflicts', label: 'Cek Konflik', path: '/conflicts' },
    ];

    const adminItems = [
        { id: 'manage', label: 'Kelola Jadwal', path: '/manage' },
        { id: 'data', label: 'Data Master', path: '/data' },
        { id: 'timeslots', label: 'Waktu JP', path: '/timeslots' },
        { id: 'settings', label: 'Pengaturan', path: '/settings' },
    ];

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            setLoginDialogOpen(false);
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
                <div className="container flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2.5 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <div className="flex h-10 w-10 items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                            <img src={logo} alt="Logo" className="h-10 w-10 object-contain rounded-md shadow-sm" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold leading-none tracking-tight">Jadwal Pelajaran</h1>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">IDN Boarding School Pamijahan</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 mx-4">
                        {navItems
                            .filter(item => {
                                // Hide 'Jadwal' link if not admin (redundant with logo)
                                if (item.id === 'schedule' && !isAdmin) return false;
                                if (item.id === 'teachers' || item.id === 'conflicts') return isAdmin;
                                return true;
                            })
                            .map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        className="relative h-9 px-4 hover:bg-transparent overflow-visible"
                                        asChild
                                    >
                                        <NavLink to={item.path} className="relative z-10">
                                            <span className={cn(
                                                "transition-colors duration-200 text-sm",
                                                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                                            )}>
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTabUnderline"
                                                    className="absolute bottom-[-22px] left-0 right-0 h-[3px] bg-primary rounded-full shadow-[0_1px_8px_rgba(99,102,241,0.4)]"
                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                />
                                            )}
                                        </NavLink>
                                    </Button>
                                );
                            })}
                        {isAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant={adminItems.some(i => location.pathname === i.path) ? 'secondary' : 'ghost'} className="h-9">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Admin
                                        <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {adminItems.map((item) => (
                                        <DropdownMenuItem
                                            key={item.id}
                                            asChild
                                        >
                                            <NavLink to={item.path} className="w-full">
                                                {item.label}
                                            </NavLink>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {/* PWA Install Button */}
                        {deferredPrompt && !isAppInstalled && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleInstallClick}
                                className="hidden sm:flex items-center gap-1.5 border-primary/20 text-xs h-9 bg-primary/5 hover:bg-primary/10 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse"
                            >
                                <Download className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-primary">Install Aplikasi</span>
                            </Button>
                        )}

                        {/* Dark Mode Toggle */}
                        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        {/* User Menu */}
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="gap-2">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName || 'User'}
                                                className="h-6 w-6 rounded-full"
                                            />
                                        ) : (
                                            <User className="h-5 w-5" />
                                        )}
                                        <span className="hidden sm:inline max-w-[120px] truncate">
                                            {user.displayName || 'User'}
                                        </span>
                                        {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                        <div>{user.displayName}</div>
                                        <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={signOut}>
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}

                        {/* Mobile Menu Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden border-t"
                    >
                        <nav className="container py-4 flex flex-col gap-1">
                            {navItems
                                .filter(item => {
                                    if (item.id === 'schedule' && !isAdmin) return false;
                                    if (item.id === 'teachers' || item.id === 'conflicts') return isAdmin;
                                    return true;
                                })
                                .map((item) => (
                                    <Button
                                        key={item.id}
                                        variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                                        className="justify-start"
                                        asChild
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <NavLink to={item.path}>
                                            {item.label}
                                        </NavLink>
                                    </Button>
                                ))}
                            {isAdmin && (
                                <>
                                    <div className="h-px bg-border my-2" />
                                    <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Manajemen</p>
                                    {adminItems.map((item) => (
                                        <Button
                                            key={item.id}
                                            variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                                            className="justify-start"
                                            asChild
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <NavLink to={item.path}>
                                                {item.label}
                                            </NavLink>
                                        </Button>
                                    ))}
                                </>
                            )}
                            {deferredPrompt && !isAppInstalled && (
                                <>
                                    <div className="h-px bg-border my-2" />
                                    <Button
                                        onClick={() => {
                                            handleInstallClick();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="justify-start gap-2"
                                        variant="outline"
                                    >
                                        <Download className="h-4 w-4" />
                                        Install Aplikasi
                                    </Button>
                                </>
                            )}
                        </nav>
                    </motion.div>
                )}
            </header>

            {/* Login Dialog */}
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogContent className="sm:max-w-md overflow-hidden p-0 rounded-2xl border-primary/10 shadow-[0_20px_50px_rgba(99,102,241,0.15)] bg-gradient-to-b from-background to-muted/20">
                    <div className="relative p-6 sm:p-8 space-y-6">
                        {/* Decorative Background Glow */}
                        <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

                        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                            {/* Logo Wrapper */}
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 dark:bg-primary/10 shadow-inner border border-primary/10 transition-transform duration-500 hover:rotate-12">
                                <img src={logo} alt="Logo" className="h-11 w-11 object-contain rounded-md" />
                            </div>

                            <div className="space-y-1.5">
                                <DialogTitle className="text-xl font-bold tracking-tight">Selamat Datang</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                                    Masuk ke sistem kelola jadwal IDN Boarding School Pamijahan
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="py-2 relative z-10">
                            <Button 
                                onClick={handleLogin} 
                                className="w-full flex items-center justify-center gap-3 h-12 text-sm font-medium border border-primary/20 bg-background text-foreground hover:bg-muted/50 transition-all shadow-sm hover:shadow-md hover:scale-[1.01]" 
                                size="lg"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#EA4335"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#4285F4"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span className="font-semibold text-foreground/80">Masuk dengan Google</span>
                            </Button>
                        </div>

                        <div className="text-center pt-2 relative z-10 border-t border-muted/50">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-70">
                                Khusus Pengelola & Admin
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
