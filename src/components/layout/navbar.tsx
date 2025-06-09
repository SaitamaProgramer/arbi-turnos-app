
"use client";

import Link from 'next/link';
import { UsersRound, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUserEmail, setCurrentUserEmail } from '@/lib/localStorage';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname(); // To re-check auth state on route change

  useEffect(() => {
    setCurrentUser(getCurrentUserEmail());
  }, [pathname]); // Re-run effect when path changes

  const handleLogout = () => {
    setCurrentUserEmail(null);
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <UsersRound size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-bold">Arbitros Turnos</h1>
        </Link>
        <div className="space-x-2 sm:space-x-4 flex items-center">
          <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base">
            Disponibilidad
          </Link>
          <Link href="/admin" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base">
            Administración
          </Link>
          
          {currentUser ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">Hola, {currentUser.split('@')[0]}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-foreground hover:text-primary">
                <LogOut size={18} className="mr-1 sm:mr-2" />
                Salir
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
                <LogIn size={18} className="mr-1 sm:mr-2" />
                Login
              </Link>
              <Link href="/register" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
                 <UserPlus size={18} className="mr-1 sm:mr-2" />
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
