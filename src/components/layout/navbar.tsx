import Link from 'next/link';
import { UsersRound, LogIn, UserPlus } from 'lucide-react'; // Icon for referees or sports related theme

export default function Navbar() {
  // Placeholder for authentication state
  const isAuthenticated = false; 
  const isAdmin = false;

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
          {/* Show Admin link if authenticated as admin - simplified for now */}
          {/* {isAuthenticated && isAdmin && ( */}
            <Link href="/admin" className="text-foreground hover:text-primary transition-colors font-medium text-sm sm:text-base">
              Administración
            </Link>
          {/* )} */}
          
          {/* Basic auth links - will be improved with actual auth state */}
          {!isAuthenticated && (
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
          {/* {isAuthenticated && (
             <Button variant="ghost" size="sm" onClick={() => console.log('logout')}>
               <LogOut size={18} className="mr-2" />
               Salir
             </Button>
          )} */}
        </div>
      </nav>
    </header>
  );
}
