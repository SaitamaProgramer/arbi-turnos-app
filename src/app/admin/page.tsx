"use client";

import { useEffect, useState } from "react";
import ShiftTable from "@/components/admin/shift-table";
import { getShiftRequests, saveShiftRequests } from "@/lib/localStorage";
import type { ShiftRequest } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function AdminPage() {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRequests(getShiftRequests());
    setIsLoading(false);
  }, []);

  const handleUpdateRequest = (updatedRequest: ShiftRequest) => {
    const updatedRequests = requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    );
    setRequests(updatedRequests);
    saveShiftRequests(updatedRequests);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Cargando turnos...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <ClipboardList size={30} className="text-primary" />
            Panel de Administración de Turnos
          </CardTitle>
          <CardDescription>
            Visualiza y gestiona las solicitudes de disponibilidad y los turnos asignados a los árbitros.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <ShiftTable requests={requests} onUpdateRequest={handleUpdateRequest} />
        </CardContent>
      </Card>
    </div>
  );
}
