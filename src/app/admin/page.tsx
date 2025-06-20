
"use client";

import { useEffect, useState } from "react";
import ShiftTable from "@/components/admin/shift-table";
import ClubMatchManager from "@/components/admin/form-config-editor"; 
import AdminDashboard from "@/components/admin/admin-dashboard";
import { 
  getShiftRequests, 
  getCurrentUserEmail, 
  findUserByEmail, 
  findClubById,
  getRefereesByClubId,
  getActiveClubId,
  setActiveClubId,
  getClubDefinedMatches, 
  getMatchAssignments,  
} from "@/lib/localStorage";
import type { ShiftRequest, User, Club, ClubSpecificMatch, MatchAssignment } from "@/types"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Settings, Loader2, ShieldAlert, Info, Copy, LayoutDashboard, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [refereesInClub, setRefereesInClub] = useState<User[]>([]);
  const [clubDefinedMatches, setClubDefinedMatches] = useState<ClubSpecificMatch[]>([]); 
  const [matchAssignments, setMatchAssignments] = useState<MatchAssignment[]>([]); 

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    const user = findUserByEmail(userEmail);
     setCurrentUser(user); 

    if (user && user.role === 'admin' && user.administeredClubId) {
      const adminClubId = user.administeredClubId;
      if (getActiveClubId() !== adminClubId) {
          setActiveClubId(adminClubId); 
      }

      const club = findClubById(adminClubId);
      if (club) {
        setCurrentClub(club);
        setRequests(getShiftRequests(club.id)); 
        setRefereesInClub(getRefereesByClubId(club.id));
        setClubDefinedMatches(getClubDefinedMatches(club.id)); 
        setMatchAssignments(getMatchAssignments().filter(a => a.clubId === club.id)); 
      } else {
         toast({ title: "Error de Club", description: "No se pudo encontrar el club que administras.", variant: "destructive" });
         router.push('/login'); 
         return;
      }
    } else if (user && user.role === 'referee') {
       toast({
        title: "Acceso Denegado",
        description: "Esta página es solo para administradores.",
        variant: "destructive"
      });
      router.push('/');
      return;
    }
     else { 
      toast({
        title: "Acceso Denegado",
        description: "No tienes permisos de administrador o no estás asociado a un club.",
        variant: "destructive"
      });
      router.push('/login');
      return;
    }
    setIsLoading(false);
  }, [router, toast]);


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

  const refreshClubMatches = () => {
    if (currentClub) {
      setClubDefinedMatches(getClubDefinedMatches(currentClub.id));
    }
  };
  

  if (isLoading || !currentUser) { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos de administración...</p>
      </div>
    );
  }

  if (!currentClub && currentUser?.role === 'admin') { 
     return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold">Error al cargar el club.</p>
        <p className="text-muted-foreground">No se pudo encontrar el club que administras. Serás redirigido...</p>
      </div>
    );
  }
  
  if (currentUser.role !== 'admin' || !currentClub) {
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
            Panel de Admin: {currentClub.name}
          </CardTitle>
          <CardDescription>
            Gestiona las postulaciones, los turnos asignados y define los partidos/turnos disponibles para tu club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dashboard" className="w-full relative">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6 relative z-10">
               <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="assignments"> 
                <ClipboardList className="mr-2 h-4 w-4" /> Gestionar Asignaciones
              </TabsTrigger>
              <TabsTrigger value="match-manager"> 
                <CalendarPlus className="mr-2 h-4 w-4" /> Definir Partidos/Turnos
              </TabsTrigger>
               <TabsTrigger value="club-info">
                <Info className="mr-2 h-4 w-4" /> Info del Club
              </TabsTrigger>
            </TabsList>
             <TabsContent value="dashboard" className="relative z-0">
              <AdminDashboard 
                clubId={currentClub.id} 
                allRefereesInClub={refereesInClub}
                shiftRequestsForClub={requests} 
              />
            </TabsContent>
            <TabsContent value="assignments" className="relative z-0"> 
              <ShiftTable 
                clubId={currentClub.id}
                definedMatchesForClub={clubDefinedMatches}
                allShiftRequestsForClub={requests}
                allClubReferees={refereesInClub}
                initialMatchAssignments={matchAssignments}
              />
            </TabsContent>
            <TabsContent value="match-manager" className="relative z-0"> 
              <ClubMatchManager clubId={currentClub.id} onMatchesUpdated={refreshClubMatches} />
            </TabsContent>
            <TabsContent value="club-info" className="relative z-0">
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
