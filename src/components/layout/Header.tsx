import { motion } from 'framer-motion';
import {
    Menu,
    X,
    Moon,
    Sun,
    LogOut,
    User,
    Settings,
    ChevronDown
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
// @ts-ignore
import logo from '@/assets/apple-icon-180x180.png';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
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
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
                            <img src={logo} alt="Logo" className="h-10 w-10 object-contain rounded-md" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold leading-none tracking-tight">Jadwal Pelajaran</h1>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">IDN Boarding School Bogor</p>
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
                            .map((item) => (
                                <Button
                                    key={item.id}
                                    variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                                    asChild
                                >
                                    <NavLink to={item.path}>
                                        {item.label}
                                    </NavLink>
                                </Button>
                            ))}
                        {isAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant={adminItems.some(i => location.pathname === i.path) ? 'secondary' : 'ghost'}>
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
                        </nav>
                    </motion.div>
                )}
            </header>

            {/* Login Dialog */}
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Login</DialogTitle>
                        <DialogDescription>
                            Login dengan akun Google untuk mengakses fitur admin
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Button onClick={handleLogin} className="w-full" size="lg">
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Login dengan Google
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
