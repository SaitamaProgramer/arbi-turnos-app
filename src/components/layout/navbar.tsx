import Link from 'next/link';
import { UsersRound } from 'lucide-react'; // Icon for referees or sports related theme

export default function Navbar() {
  return (
    <header className="bg-card shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <UsersRound size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-bold">Arbitros Turnos</h1>
        </Link>
        <div className="space-x-4">
          <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium">
            Disponibilidad
          </Link>
          <Link href="/admin" className="text-foreground hover:text-primary transition-colors font-medium">
            Administración
          </Link>
        </div>
      </nav>
    </header>
  );
}
