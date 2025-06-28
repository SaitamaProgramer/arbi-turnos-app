
"use client";

import type { User, ShiftRequest } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, ListX, Users, FileText } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface AdminDashboardProps {
  allRefereesInClub: User[];
  shiftRequestsForClub: ShiftRequest[];
}

export default function AdminDashboard({ allRefereesInClub, shiftRequestsForClub }: AdminDashboardProps) {
  
  const { refereesWhoSubmitted, refereesPending, pendingPostulationsCount } = useMemo(() => {
    const submittedUserIds = new Set(
      shiftRequestsForClub.map(req => req.userId)
    );

    const submitted = allRefereesInClub.filter(ref => submittedUserIds.has(ref.id));
    const pending = allRefereesInClub.filter(ref => !submittedUserIds.has(ref.id));
    const count = shiftRequestsForClub.filter(req => req.status === 'pending').length;

    return { 
      refereesWhoSubmitted: submitted, 
      refereesPending: pending,
      pendingPostulationsCount: count,
    };
  }, [allRefereesInClub, shiftRequestsForClub]);

  const totalReferees = allRefereesInClub.length;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Árbitros en la Asociación</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalReferees}</div>
          <p className="text-xs text-muted-foreground">Árbitros registrados en esta asociación.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Postulaciones Pendientes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingPostulationsCount}</div>
          <p className="text-xs text-muted-foreground">Postulaciones enviadas esperando asignación.</p>
        </CardContent>
      </Card>

      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl">Estado de Envío de Postulaciones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <ListChecks className="h-5 w-5 mr-2 text-green-500" />
              Árbitros que Enviaron ({refereesWhoSubmitted.length})
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
