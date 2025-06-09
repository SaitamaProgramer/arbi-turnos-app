
"use client";

import { useEffect, useState } from "react";
import ShiftTable from "@/components/admin/shift-table";
import FormConfigEditor from "@/components/admin/form-config-editor";
import { getShiftRequests, saveShiftRequests, getCurrentUserEmail, findUserByEmail } from "@/lib/localStorage";
import type { ShiftRequest, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Settings, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    const user = findUserByEmail(userEmail);
    if (user && user.role === 'admin') {
      setIsAuthorized(true);
    } else {
      toast({
        title: "Acceso Denegado",
        description: "No tienes permisos para acceder a esta página.",
        variant: "destructive"
      });
      router.push('/'); // Redirect non-admins to user page
      return;
    }
    setAuthLoading(false);
  }, [router, toast]);

  useEffect(() => {
    if (isAuthorized && !authLoading) {
      setRequests(getShiftRequests());
      setIsLoading(false);
    }
  }, [isAuthorized, authLoading]);

  const handleUpdateRequest = (updatedRequest: ShiftRequest) => {
    const updatedRequests = requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    );
    setRequests(updatedRequests);
    saveShiftRequests(updatedRequests);
  };

  if (authLoading || (isAuthorized && isLoading)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos de administración...</p>
      </div>
    );
  }

  if (!isAuthorized) {
     return (
      <div className="flex justify-center items-center h-64">
        <p>Redirigiendo...</p>
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
