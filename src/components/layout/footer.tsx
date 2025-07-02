
import { SuggestionDialog } from "./suggestion-dialog";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ArbiTurnos. Desarrollado por Matías Stebé.</p>
        <SuggestionDialog />
      </div>
    </footer>
  );
}
