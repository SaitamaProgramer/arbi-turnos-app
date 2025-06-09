"use client";

import { useEffect, useState } from "react";
import ShiftTable from "@/components/admin/shift-table";
import FormConfigEditor from "@/components/admin/form-config-editor";
import { getShiftRequests, saveShiftRequests } from "@/lib/localStorage";
import type { ShiftRequest } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Settings } from "lucide-react";

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
        <p>Cargando datos de administración...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <ClipboardList size={30} className="text-primary" />
            Panel de Administración
          </CardTitle>
          <CardDescription>
            Gestiona las solicitudes de disponibilidad, los turnos asignados y la configuración del formulario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shifts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-1/2 mb-6">
              <TabsTrigger value="shifts">
                <ClipboardList className="mr-2 h-4 w-4" /> Gestión de Turnos
              </TabsTrigger>
              <TabsTrigger value="form-config">
                <Settings className="mr-2 h-4 w-4" /> Configurar Formulario
              </TabsTrigger>
            </TabsList>
            <TabsContent value="shifts">
              <ShiftTable requests={requests} onUpdateRequest={handleUpdateRequest} />
            </TabsContent>
            <TabsContent value="form-config">
              <FormConfigEditor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
