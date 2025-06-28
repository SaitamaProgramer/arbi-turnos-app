
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-10 w-10" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

