
import Link from 'next/link';
import { UsersRound, LogIn, UserPlus, LogOut, ShieldCheck } from 'lucide-react';
import { getUserFromSession } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions';

async function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit" className="text-foreground hover:text-primary">
          <LogOut size={18} className="mr-1 sm:mr-2" />
          Salir
      </Button>
    </form>
  )
}

export default async function Navbar() {
  const currentUser = await getUserFromSession();

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <UsersRound size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-bold">ArbiTurnos</h1>
        </Link>
        <div className="space-x-2 sm:space-x-4 flex items-center">
          {currentUser && (
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base">
              Disponibilidad
            </Link>
          )}
          
          {currentUser?.role === 'admin' && (
            <Link href="/admin" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base inline-flex items-center">
              <ShieldCheck size={18} className="mr-1 sm:mr-2" />
              Administración
            </Link>
          )}
          
          {currentUser ? (
            <>
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
      </nav>
    </header>
  );
}
