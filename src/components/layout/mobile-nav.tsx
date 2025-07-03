
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  UsersRound,
  LogIn,
  UserPlus,
  LogOut,
  ShieldCheck,
  UserCog,
  CalendarCheck,
  HelpCircle,
} from "lucide-react";
import type { User } from "@/types";
import { logout } from "@/lib/actions";
import { HelpDialog } from "./help-dialog";
import { Dialog } from "../ui/dialog";

interface MobileNavProps {
  currentUser: User | null;
}

export function MobileNav({ currentUser }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to close the sheet on navigation
  const closeSheet = () => setIsOpen(false);

  return (
    <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
            </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 pt-4 w-[300px] flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegación Principal</SheetTitle>
              <SheetDescription>
                Enlaces para navegar por la aplicación ArbiTurnos.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4 border-b">
                <Link href="/" className="flex items-center gap-2 text-primary" onClick={closeSheet}>
                    <UsersRound size={28} strokeWidth={2.5} />
                    <h1 className="text-2xl font-bold">ArbiTurnos</h1>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col justify-between">
                <div className="p-2 space-y-1">
                    {currentUser ? (
                    <>
                        <Link href="/" className="flex items-center text-base font-medium p-2 rounded-md hover:bg-accent" onClick={closeSheet}>
                            <CalendarCheck size={18} className="mr-2" /> Disponibilidad
                        </Link>
                        {currentUser.isAdmin && (
                        <Link href="/admin" className="flex items-center text-base font-medium p-2 rounded-md hover:bg-accent" onClick={closeSheet}>
                            <ShieldCheck size={18} className="mr-2" /> Administración
                        </Link>
                        )}
                        <Link href="/account" className="flex items-center text-base font-medium p-2 rounded-md hover:bg-accent" onClick={closeSheet}>
                            <UserCog size={18} className="mr-2" /> Mi Cuenta
                        </Link>
                    </>
                    ) : (
                    <>
                        <Link href="/login" className="flex items-center text-base font-medium p-2 rounded-md hover:bg-accent" onClick={closeSheet}>
                            <LogIn size={18} className="mr-2" /> Login
                        </Link>
                        <Link href="/register" className="flex items-center text-base font-medium p-2 rounded-md hover:bg-accent" onClick={closeSheet}>
                            <UserPlus size={18} className="mr-2" /> Registrarse
                        </Link>
                    </>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                        <HelpDialog>
                            <Button variant="ghost" className="w-full justify-start text-base font-medium p-2 h-auto">
                                <HelpCircle size={18} className="mr-2" /> Ayuda
                            </Button>
                        </HelpDialog>
                    </div>
                </div>
                {currentUser && (
                    <div className="p-2 border-t">
                        <form action={logout} className="w-full">
                            <Button variant="ghost" type="submit" className="w-full justify-start text-base font-medium p-2 h-auto text-destructive hover:text-destructive">
                                <LogOut size={18} className="mr-2" />
                                Salir
                            </Button>
                        </form>
                    </div>
                )}
            </nav>
        </SheetContent>
        </Sheet>
    </div>
  );
}
