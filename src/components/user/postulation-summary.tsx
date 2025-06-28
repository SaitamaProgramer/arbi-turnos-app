'use client';

import type { ShiftRequestWithMatches, MatchAssignment, Club } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Car, ClipboardList, CheckSquare, Edit3, Ban, BadgeCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface PostulationSummaryProps {
  clubName: string;
  postulation: ShiftRequestWithMatches;
  assignments: Omit<MatchAssignment, 'id' | 'clubId' | 'assignedAt'>[];
  canEdit: boolean;
  onEdit: () => void;
}

export default function PostulationSummary({ clubName, postulation, assignments, canEdit, onEdit }: PostulationSummaryProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <CheckSquare className="text-green-500" />
          Resumen de tu Postulación para: <span className="font-bold text-primary">{clubName}</span>
        </CardTitle>
        <CardDescription>
          Esta es tu postulación actual. {canEdit ? "Puedes editarla si el plazo lo permite." : "Esta postulación ya no es editable."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarDays className="text-primary" />Partidos Seleccionados:</h3>
          {postulation.selectedMatches.length > 0 ? (
            <ul className="space-y-3">
              {postulation.selectedMatches.map(match => {
                const isAssignedToThisMatch = assignments.some(asg => asg.matchId === match.id);
                return (
                  <li key={match.id} className="p-3 bg-muted/30 rounded-md border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{match.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(match.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })} a las {match.time} hs.
                        </p>
                        <p className="text-sm text-muted-foreground">Lugar: {match.location}</p>
                      </div>
                      {isAssignedToThisMatch && (
                        <Badge variant="default" className="bg-green-500 text-white whitespace-nowrap mt-1">
                          <BadgeCheck size={14} className="mr-1" /> Asignado
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-muted-foreground">No has seleccionado partidos en esta postulación.</p>}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Car className="text-primary" />Disponibilidad de Auto:</h3>
          <p className="text-muted-foreground">{postulation.hasCar ? 'Sí' : 'No'}</p>
        </div>
        {postulation.notes && (
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><ClipboardList className="text-primary" />Notas Adicionales:</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{postulation.notes}</p>
          </div>
        )}

        <div className="border-t pt-4">
          {canEdit ? (
            <Button onClick={onEdit} className="w-full sm:w-auto">
              <Edit3 className="mr-2 h-4 w-4" /> Editar Postulación
            </Button>
          ) : (
            <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm flex items-start gap-2">
              <Ban size={20} className="flex-shrink-0 mt-0.5" />
              <span>La edición no está permitida. Esto puede ser porque la fecha de uno o más partidos está demasiado próxima, o porque ya te han asignado a uno de los partidos de esta postulación.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
