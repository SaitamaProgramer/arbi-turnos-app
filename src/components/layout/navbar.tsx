'use client';

import Link from 'next/link';
import { UsersRound, LogIn, UserPlus, LogOut, ShieldCheck, UserCog, CalendarCheck, X } from 'lucide-react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions';
import { HelpDialog } from './help-dialog';
import { MobileNav } from './mobile-nav';
import { useState, useEffect } from 'react';
import { OnboardingHelpDialog } from './onboarding-help-dialog';

function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit" className="text-foreground hover:text-primary">
          <LogOut size={18} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Salir</span>
      </Button>
    </form>
  )
}

export default function Navbar({ currentUser }: { currentUser: User | null }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    // We only want to run this on the client, and only when a user is logged in.
    if (isLoggedIn && typeof window !== 'undefined') {
      const isNew = localStorage.getItem('isNewUser');
      if (isNew === 'true') {
        // Use a small timeout to ensure the UI is mounted and ready.
        // This helps prevent modals from appearing before the page is fully interactive.
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoggedIn]); // Depend on the boolean flag to avoid object reference issues.

  const handleOnboardingClose = () => {
    if (showOnboarding) {
      setShowOnboarding(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isNewUser');
      }
    }
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <UsersRound size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-bold">ArbiTurnos</h1>
        </Link>
        
        <div className="hidden md:flex space-x-1 sm:space-x-2 items-center">
          {currentUser && (
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
              <CalendarCheck size={18} className="mr-1 sm:mr-2" />
              Disponibilidad
            </Link>
          )}
          
          {currentUser?.isAdmin && (
            <Link href="/admin" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
              <ShieldCheck size={18} className="mr-1 sm:mr-2" />
              Administración
            </Link>
          )}
          
          <HelpDialog />

          {currentUser ? (
            <>
              <Link href="/account" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
                <UserCog size={18} className="mr-1 sm:mr-2" />
                Mi Cuenta
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">Hola, {currentUser.name.split(' ')[0]}</span>
              <LogoutButton />
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

        <MobileNav currentUser={currentUser} />
      </nav>
      {showOnboarding && currentUser && (
        <OnboardingHelpDialog
          isOpen={showOnboarding}
          onClose={handleOnboardingClose}
          defaultTab={currentUser.isAdmin ? 'admin' : 'referee'}
        />
      )}
    </header>
  );
}
