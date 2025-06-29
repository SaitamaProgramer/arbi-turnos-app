
import { 
  getAdminPageData
} from "@/lib/actions";
import { getUserFromSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Settings, Loader2, ShieldAlert, Info, Copy, LayoutDashboard, CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import ShiftTable from "@/components/admin/shift-table";
import ClubMatchManager from "@/components/admin/form-config-editor";
import AdminDashboard from "@/components/admin/admin-dashboard";
import CopyClubIdButton from "@/components/admin/copy-club-id-button";


export default async function AdminPage() {
  const user = await getUserFromSession();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'admin' || !user.administeredClubId) {
     redirect('/');
  }

  const adminClubId = user.administeredClubId;
  const adminData = await getAdminPageData(adminClubId);

  if (!adminData) {
    return (
     <div className="flex flex-col items-center justify-center h-64 text-center">
       <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
       <p className="text-xl font-semibold">Error al cargar el club.</p>
       <p className="text-muted-foreground">No se pudo encontrar la información para el club que administras.</p>
     </div>
   );
  }

  const { club, referees, shiftRequests, definedMatches, matchAssignments } = adminData;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            Panel de Admin: {club.name}
          </CardTitle>
          <CardDescription>
            Gestiona las postulaciones, los turnos asignados y define los partidos/turnos disponibles para tu club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dashboard" className="w-full relative">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-24 md:mb-8 relative z-10 [transform:translateZ(0px)]">
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
                shiftRequestsForClub={shiftRequests}
                allRefereesInClub={referees}
              />
            </TabsContent>
            <TabsContent value="assignments" className="relative z-0"> 
              <ShiftTable 
                clubId={club.id}
                initialDefinedMatches={definedMatches}
                initialShiftRequests={shiftRequests}
                initialClubReferees={referees}
                initialMatchAssignments={matchAssignments}
              />
            </TabsContent>
            <TabsContent value="match-manager" className="relative z-0"> 
              <ClubMatchManager clubId={club.id} initialMatches={definedMatches} />
            </TabsContent>
            <TabsContent value="club-info" className="relative z-0">
              <Card>
                <CardHeader>
                  <CardTitle>Información de tu Club</CardTitle>
                  <CardDescription>Aquí puedes ver los detalles de tu club y compartir el código con tus árbitros.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p><strong>Nombre del Club:</strong> {club.name}</p>
                  <div className="flex items-center gap-2">
                    <strong>Código del Club:</strong> 
                    <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{club.id}</span>
                    <CopyClubIdButton clubId={club.id} />
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
