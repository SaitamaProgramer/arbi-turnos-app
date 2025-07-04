
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, AvailabilityFormData } from "@/types";
import { ListChecks, AlertTriangle, Users, FileText, Edit3, PlusCircle, Loader2 } from "lucide-react";
import { useState, useCallback, useMemo, useTransition, useEffect } from "react";
import { isPostulationEditable } from "@/lib/utils";
import PostulationSummary from "./postulation-summary";
import AvailabilityEditor from "./availability-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { joinAnotherClub } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface AvailabilityFormProps {
  initialData: AvailabilityFormData | null;
  user: User;
}

function JoinClubForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newClubCode, setNewClubCode] = useState("");

  const handleJoinClub = async () => {
    startTransition(async () => {
      const result = await joinAnotherClub(newClubCode);
      if (result.success) {
        toast({
          title: "¡Te has unido con éxito!",
          description: "La asociación ha sido añadida a tu perfil.",
          variant: "success",
        });
        router.refresh();
      } else {
        toast({
          title: "Error al Unirse",
          description: result.error,
          variant: "destructive",
        });
      }
      setNewClubCode("");
    });
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><PlusCircle className="text-primary"/> Unirse a otra Asociación</h3>
        <div className="flex flex-col md:flex-row gap-2">
            <Input
                placeholder="Ingresa el código de la asociación"
                value={newClubCode}
                onChange={(e) => setNewClubCode(e.target.value)}
                disabled={isPending}
            />
            <Button
                onClick={handleJoinClub}
                disabled={isPending || !newClubCode.trim()}
                className="w-full md:w-auto"
            >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Unirse
            </Button>
        </div>
    </div>
  )
}

export default function AvailabilityForm({ initialData, user }: AvailabilityFormProps) {
  const router = useRouter();
  const [activeClubId, setActiveClubId] = useState(initialData?.activeClubId || '');
  const [view, setView] = useState<'summary' | 'edit'>('edit');
  const [canEditCurrentPostulation, setCanEditCurrentPostulation] = useState(true);
  
  const activeClubData = useMemo(() => {
    return activeClubId ? initialData?.clubs[activeClubId] : undefined;
  }, [activeClubId, initialData]);
  
  useEffect(() => {
    if (activeClubData?.postulation) {
        setView('summary');
        const isEditable = isPostulationEditable(
            activeClubData.postulation.selectedMatches,
            activeClubData.assignments
        );
        setCanEditCurrentPostulation(isEditable);
    } else {
        setView('edit');
        setCanEditCurrentPostulation(true);
    }
  }, [activeClubData]);
  
  const handleClubChange = useCallback((newClubId: string) => {
    setActiveClubId(newClubId);
  }, []);
  
  if (!initialData) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileText className="text-primary" /> Postularse a Partidos/Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">No Perteneces a Ninguna Asociación</p>
          <p className="mb-4">Para empezar, únete a una asociación usando el código que te proporcione el administrador.</p>
          <div className="max-w-md mx-auto text-left">
            <JoinClubForm />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { clubs: userClubsMap } = initialData;
  const userClubs = Object.values(userClubsMap).map(c => ({ id: c.id, name: c.name }));

  const hasPostulation = !!activeClubData?.postulation;
  const showSummary = hasPostulation && view === 'summary';
  const headerIcon = hasPostulation ? <ListChecks className="text-primary" /> : <Edit3 className="text-primary" />;
  const headerTitle = hasPostulation ? "Tu Postulación" : "Crear Postulación";

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {headerIcon}
          {headerTitle}
        </CardTitle>
        <CardDescription>
          {userClubs.length > 1 ? "Selecciona una asociación para ver o editar tu postulación." : "Aquí puedes gestionar tu postulación para los próximos partidos."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userClubs.length > 1 && (
          <div className="mb-6">
            <label htmlFor="club-select" className="text-base flex items-center gap-2 mb-2 font-medium"><Users className="text-primary" />Asociación</label>
            <Select
              onValueChange={handleClubChange}
              value={activeClubId}
            >
              <SelectTrigger id="club-select">
                <SelectValue placeholder="Selecciona la asociación" />
              </SelectTrigger>
              <SelectContent>
                {userClubs.map(club => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!activeClubId && userClubs.length > 0 && (
          <div className="text-center py-6 border-t mt-6">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
            <p className="text-lg font-semibold text-muted-foreground mb-1">Selecciona una Asociación</p>
            <p className="text-xs text-muted-foreground">
              Por favor, selecciona una de tus asociaciones para continuar.
            </p>
          </div>
        )}

        {activeClubData && (
          <div className="border-t pt-6 mt-6">
            {showSummary && activeClubData.postulation ? (
              <PostulationSummary
                clubName={activeClubData.name}
                postulation={activeClubData.postulation}
                assignments={activeClubData.assignments}
                canEdit={canEditCurrentPostulation}
                onEdit={() => setView('edit')}
              />
            ) : (
              <AvailabilityEditor
                clubId={activeClubData.id}
                clubName={activeClubData.name}
                matches={activeClubData.matches}
                assignments={activeClubData.assignments}
                postulation={activeClubData.postulation}
                canEdit={canEditCurrentPostulation}
              />
            )}
          </div>
        )}
        <JoinClubForm />
      </CardContent>
    </Card>
  );
}
