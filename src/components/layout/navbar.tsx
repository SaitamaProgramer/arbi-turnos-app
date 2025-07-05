
'use client';

import Link from 'next/link';
import { UsersRound, LogIn, UserPlus, LogOut, ShieldCheck, UserCog, CalendarCheck, X } from 'lucide-react';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions';
import { HelpDialog } from './help-dialog';
import { MobileNav } from './mobile-nav';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect } from 'react';

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
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const isNew = localStorage.getItem('isNewUser');
    if (isNew === 'true') {
      const timer = setTimeout(() => setShowWelcome(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleWelcomeClose = () => {
    if (showWelcome) {
      setShowWelcome(false);
      localStorage.removeItem('isNewUser');
    }
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          handleWelcomeClose();
      }
  }

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
          
            <Popover open={showWelcome} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    {/* The HelpDialog now acts as the trigger */}
                    <HelpDialog>
                        {/* We add the indicator here, relative to the button */}
                        {showWelcome && (
                            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                        )}
                    </HelpDialog>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-80 z-[101]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start gap-2">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none text-lg">¡Bienvenido a ArbiTurnos!</h4>
                            <p className="text-sm text-muted-foreground">
                            ¿Es tu primera vez por aquí? Lee nuestra guía rápida para empezar.
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 -mt-1 -mr-2" onClick={handleWelcomeClose}>
                            <X size={16}/>
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

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
    </header>
  );
}
