"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, AvailabilityFormData } from "@/types";
import { ListChecks, AlertTriangle, Users, FileText, Edit3 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { isPostulationEditable } from "@/lib/utils";
import PostulationSummary from "./postulation-summary";
import AvailabilityEditor from "./availability-editor";

interface AvailabilityFormProps {
  initialData: AvailabilityFormData | null;
  user: User;
}

export default function AvailabilityForm({ initialData, user }: AvailabilityFormProps) {
  const [activeClubId, setActiveClubId] = useState(initialData?.activeClubId || '');
  const [view, setView] = useState<'summary' | 'edit'>('edit');
  
  const activeClubData = useMemo(() => {
    return activeClubId ? initialData?.clubs[activeClubId] : undefined;
  }, [activeClubId, initialData]);

  const canEditCurrentPostulation = useMemo(() => {
    return activeClubData?.postulation ? isPostulationEditable(
      activeClubData.postulation.selectedMatches,
      activeClubData.assignments
    ) : true;
  }, [activeClubData]);
  
  const handleClubChange = useCallback((newClubId: string) => {
    setActiveClubId(newClubId);
    const clubData = initialData?.clubs[newClubId];
    if (clubData?.postulation) {
      setView('summary');
    } else {
      setView('edit');
    }
  }, [initialData]);

  // Set initial view based on whether there's a postulation for the active club
  useState(() => {
    if (activeClubData?.postulation) {
      setView('summary');
    }
  });
  
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
          <p>Contacta a un administrador para unirte a una asociación o verifica tu registro.</p>
        </CardContent>
      </Card>
    );
  }

  const { clubs: userClubsMap } = initialData;
  const userClubs = Object.values(userClubsMap).map(c => ({ id: c.id, name: c.name }));

  const hasPostulation = !!activeClubData?.postulation;
  const showSummary = hasPostulation && view === 'summary';

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {hasPostulation ? <ListChecks className="text-primary" /> : <Edit3 className="text-primary" />}
          {hasPostulation ? "Tu Postulación" : "Crear Postulación"}
        </CardTitle>
        <CardDescription>
          {userClubs.length > 1 && "Selecciona una asociación para ver o editar tu postulación."}
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

      </CardContent>
    </Card>
  );
}
