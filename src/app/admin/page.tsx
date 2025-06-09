
"use client";

import { useEffect, useState } from "react";
import ShiftTable from "@/components/admin/shift-table";
import FormConfigEditor from "@/components/admin/form-config-editor";
import { getShiftRequests, saveShiftRequests, getCurrentUserEmail, findUserByEmail, findClubById } from "@/lib/localStorage";
import type { ShiftRequest, User, Club } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Settings, Loader2, ShieldAlert, Info, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    const user = findUserByEmail(userEmail);
    if (user && user.role === 'admin' && user.clubId) {
      setCurrentUser(user);
      const club = findClubById(user.clubId);
      if (club) {
        setCurrentClub(club);
        setRequests(getShiftRequests(club.id));
      } else {
         toast({ title: "Error de Club", description: "No se pudo encontrar el club asociado a tu cuenta.", variant: "destructive" });
         router.push('/login'); // Or a generic error page
         return;
      }
    } else {
      toast({
        title: "Acceso Denegado",
        description: "No tienes permisos de administrador para un club o no estás asociado a uno.",
        variant: "destructive"
      });
      router.push(user && user.role === 'referee' ? '/' : '/login');
      return;
    }
    setIsLoading(false);
  }, [router, toast]);

  const handleUpdateRequest = (updatedRequest: ShiftRequest) => {
    if (!currentClub) return;
    // The saveShiftRequests function in localStorage handles global list,
    // so we just need to re-fetch for the current club to update the local state.
    // To make it reactive immediately without full re-fetch complexity for this demo:
    const updatedRequests = requests.map(req => 
      req.id === updatedRequest.id ? updatedRequest : req
    );
    setRequests(updatedRequests);
    // The actual saving is done by updateShiftRequestStatus in localStorage
    // This ensures the global list is updated.
    // No need to call saveShiftRequests directly from here if it's already handled.
  };

  const copyClubId = () => {
    if (currentClub?.id) {
      navigator.clipboard.writeText(currentClub.id)
        .then(() => {
          toast({ title: "Código Copiado", description: "El código de tu club ha sido copiado al portapapeles." });
        })
        .catch(err => {
          toast({ title: "Error al Copiar", description: "No se pudo copiar el código.", variant: "destructive" });
        });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos de administración...</p>
      </div>
    );
  }

  if (!currentUser || !currentClub) {
     return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Acceso no autorizado o error.</p>
        <p className="text-muted-foreground">Estás siendo redirigido...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <ClipboardList size={30} className="text-primary" />
            Panel de Admin: {currentClub.name}
          </CardTitle>
          <CardDescription>
            Gestiona las solicitudes de disponibilidad, los turnos asignados y la configuración del formulario para tu club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shifts" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <TabsTrigger value="shifts">
                <ClipboardList className="mr-2 h-4 w-4" /> Gestión de Turnos
              </TabsTrigger>
              <TabsTrigger value="form-config">
                <Settings className="mr-2 h-4 w-4" /> Configurar Formulario
              </TabsTrigger>
               <TabsTrigger value="club-info">
                <Info className="mr-2 h-4 w-4" /> Info del Club
              </TabsTrigger>
            </TabsList>
            <TabsContent value="shifts">
              <ShiftTable requests={requests} onUpdateRequest={handleUpdateRequest} clubId={currentClub.id} />
            </TabsContent>
            <TabsContent value="form-config">
              <FormConfigEditor clubId={currentClub.id} />
            </TabsContent>
            <TabsContent value="club-info">
              <Card>
                <CardHeader>
                  <CardTitle>Información de tu Club</CardTitle>
                  <CardDescription>Aquí puedes ver los detalles de tu club y compartir el código con tus árbitros.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p><strong>Nombre del Club:</strong> {currentClub.name}</p>
                  <div className="flex items-center gap-2">
                    <strong>Código del Club:</strong> 
                    <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{currentClub.id}</span>
                    <Button variant="outline" size="sm" onClick={copyClubId}>
                      <Copy size={14} className="mr-1" /> Copiar Código
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Comparte este código con los árbitros que deseen unirse a tu club.
                    Deberán ingresarlo durante el proceso de registro.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
