
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
  const [refereesWhoSubmitted, setRefereesWhoSubmitted] = useState<User[]>([]);
  const [refereesPending, setRefereesPending] = useState<User[]>([]);

  useEffect(() => {
    // A referee is considered to have "submitted" if they have any ShiftRequest (pending or assigned)
    // for the current club. This doesn't distinguish by time period, just if they ever submitted.
    const submittedEmails = new Set(
      shiftRequestsForClub
        .filter(req => req.clubId === clubId && (req.status === 'pending' || req.status === 'assigned'))
        .map(req => req.userEmail)
    );

    const submitted = allRefereesInClub.filter(ref => submittedEmails.has(ref.email));
    const pending = allRefereesInClub.filter(ref => !submittedEmails.has(ref.email));

    setRefereesWhoSubmitted(submitted);
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
          <CardTitle className="text-sm font-medium">Postulaciones Pendientes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{shiftRequestsForClub.filter(req => req.clubId === clubId && req.status === 'pending').length}</div>
          <p className="text-xs text-muted-foreground">Postulaciones enviadas esperando asignación.</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl">Estado de Envío de Postulaciones</CardTitle>
          <CardDescription>
            Árbitros que han enviado alguna postulación y los que están pendientes (considerando solicitudes activas).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <ListChecks className="h-5 w-5 mr-2 text-green-500" />
              Árbitros que Enviaron Postulación ({refereesWhoSubmitted.length})
            </h3>
            {refereesWhoSubmitted.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                {refereesWhoSubmitted.map(ref => <li key={ref.id}>{ref.name} ({ref.email})</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ningún árbitro ha enviado postulaciones activamente.</p>
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
              <p className="text-sm text-muted-foreground">Todos los árbitros han enviado alguna postulación.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
