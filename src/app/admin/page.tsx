
import { getUserFromSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAdminPageData, getSuggestions } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/admin-dashboard";
import ShiftTable from "@/components/admin/shift-table";
import ClubMatchManager from "@/components/admin/form-config-editor";
import MembersManager from "@/components/admin/members-manager";
import ClubSettingsManager from "@/components/admin/club-settings-manager";
import SuggestionsView from "@/components/admin/suggestions-view";
import { AlertTriangle, BadgeInfo, BarChart3, FilePlus2, ListOrdered, Settings, Users, MessageSquare } from "lucide-react";
import CopyClubIdButton from "@/components/admin/copy-club-id-button";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Administración',
  description: 'Gestiona tu asociación, partidos, asignaciones y miembros.',
};

export default async function AdminPage() {
    const user = await getUserFromSession();

    if (!user || !user.isAdmin || !user.administeredClubIds || user.administeredClubIds.length === 0) {
        redirect('/');
    }
    
    // For now, let's work with the first club the user administers.
    const activeClubId = user.administeredClubIds[0];
    const adminData = await getAdminPageData(activeClubId);

    if (!adminData) {
        return (
            <div className="flex h-full w-full items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                    <h2 className="text-2xl font-bold">Error al Cargar Datos</h2>
                    <p className="text-muted-foreground">No se pudieron cargar los datos de la asociación. Inténtalo de nuevo más tarde.</p>
                </div>
            </div>
        );
    }
    
    const { club, clubMembers, shiftRequests, definedMatches, matchAssignments } = adminData;
    
    const allRefereesInClub = Array.isArray(clubMembers) ? clubMembers.filter(m => m.isReferee) : [];

    const suggestions = user.isDeveloper ? await getSuggestions() : [];

    const tabs = [
        { value: "dashboard", label: "Dashboard", icon: BarChart3 },
        { value: "assignments", label: "Asignaciones", icon: ListOrdered },
        { value: "define_matches", label: "Definir Partidos", icon: FilePlus2 },
        { value: "members", label: "Miembros", icon: Users },
        { value: "config", label: "Configuración", icon: Settings },
    ];
    
    if (user.isDeveloper) {
        tabs.push({ value: "suggestions", label: "Sugerencias", icon: MessageSquare });
    }

    return (
        <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="h-auto flex-wrap justify-center sm:justify-start">
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        <tab.icon className="mr-2 h-4 w-4"/>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            <div className="mt-6">
                <TabsContent value="dashboard" className="mt-0">
                     <AdminDashboard 
                       allRefereesInClub={allRefereesInClub}
                       shiftRequestsForClub={Array.isArray(shiftRequests) ? shiftRequests : []}
                     />
                </TabsContent>
                <TabsContent value="assignments" className="mt-0">
                    <ShiftTable
                        clubId={club.id}
                        clubName={club.name}
                        initialDefinedMatches={definedMatches || []}
                        initialShiftRequests={shiftRequests || []}
                        initialClubMembers={clubMembers || []}
                        initialMatchAssignments={matchAssignments || []}
                    />
                </TabsContent>
                <TabsContent value="define_matches" className="mt-0">
                     <ClubMatchManager 
                        clubId={club.id}
                        initialMatches={definedMatches || []}
                        initialMatchAssignments={matchAssignments || []}
                    />
                </TabsContent>
                <TabsContent value="members" className="mt-0">
                    <MembersManager
                        clubId={club.id}
                        members={clubMembers || []}
                        currentUserId={user.id}
                    />
                </TabsContent>
                 <TabsContent value="config" className="space-y-6 mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BadgeInfo size={22}/> Código de la Asociación</CardTitle>
                            <CardDescription>Comparte este código con los árbitros para que se unan a tu asociación.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <p className="text-sm font-semibold text-muted-foreground">Código:</p>
                                <p className="font-mono text-sm p-2 bg-muted rounded-md">{club.id}</p>
                                <CopyClubIdButton clubId={club.id} />
                            </div>
                        </CardContent>
                    </Card>
                    <ClubSettingsManager club={club} />
                </TabsContent>
                {user.isDeveloper && (
                    <TabsContent value="suggestions" className="mt-0">
                         <SuggestionsView suggestions={suggestions} />
                    </TabsContent>
                )}
            </div>
        </Tabs>
    );
}
