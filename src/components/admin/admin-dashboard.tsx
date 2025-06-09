
"use client";

import type { User, ShiftRequest } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ListChecks, ListX, Users, FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminDashboardProps {
  clubId: string;
  allRefereesInClub: User[];
  shiftRequestsForClub: ShiftRequest[];
}

export default function AdminDashboard({ clubId, allRefereesInClub, shiftRequestsForClub }: AdminDashboardProps) {
  const [refereesWhoCompleted, setRefereesWhoCompleted] = useState<User[]>([]);
  const [refereesPending, setRefereesPending] = useState<User[]>([]);

  useEffect(() => {
    const completedEmails = new Set(
      shiftRequestsForClub
        .filter(req => req.status === 'pending' || req.status === 'assigned') // Consider submitted if pending or assigned for simplicity
        .map(req => req.userEmail)
    );

    const completed = allRefereesInClub.filter(ref => completedEmails.has(ref.email));
    const pending = allRefereesInClub.filter(ref => !completedEmails.has(ref.email));

    setRefereesWhoCompleted(completed);
    setRefereesPending(pending);

  }, [allRefereesInClub, shiftRequestsForClub, clubId]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Árbitros en el Club</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{allRefereesInClub.length}</div>
          <p className="text-xs text-muted-foreground">Árbitros registrados en este club.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Solicitudes de Turno Pendientes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{shiftRequestsForClub.filter(req => req.status === 'pending').length}</div>
          <p className="text-xs text-muted-foreground">Disponibilidades enviadas esperando asignación.</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl">Estado de Envío de Disponibilidad</CardTitle>
          <CardDescription>
            Árbitros que han enviado su disponibilidad y los que están pendientes (considerando solicitudes activas).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <ListChecks className="h-5 w-5 mr-2 text-green-500" />
              Árbitros que Completaron ({refereesWhoCompleted.length})
            </h3>
            {refereesWhoCompleted.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                {refereesWhoCompleted.map(ref => <li key={ref.id}>{ref.name} ({ref.email})</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ningún árbitro ha enviado disponibilidad activamente.</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <ListX className="h-5 w-5 mr-2 text-red-500" />
              Árbitros Pendientes de Enviar ({refereesPending.length})
            </h3>
            {refereesPending.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                {refereesPending.map(ref => <li key={ref.id}>{ref.name} ({ref.email})</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Todos los árbitros han enviado su disponibilidad.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
