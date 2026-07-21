import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, db, getDbPath } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAdminCheck } from '@/hooks/useFirebase';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    authInitialized: boolean;
    signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false);
    const { isAdmin, loading: adminLoading } = useAdminCheck(user?.uid ?? null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            setAuthInitialized(true);
        });
        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const uid = result.user.uid;

            const adminDoc = await getDoc(doc(db, getDbPath('admins'), uid));
            if (!adminDoc.exists()) {
                await firebaseSignOut(auth);
                return { success: false, error: 'Akun ini tidak memiliki akses admin.' };
            }

            return { success: true };
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, error: '' };
            }
            return { success: false, error: 'Gagal login. Silakan coba lagi.' };
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const value = {
        user,
        isAdmin,
        loading: loading || adminLoading,
        authInitialized,
        signInWithGoogle,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
