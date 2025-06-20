
"use client";

import type { ShiftRequest, ClubSpecificMatch, User, MatchAssignment } from "@/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  assignRefereeToMatch,
  unassignRefereeFromMatch,
  getRefereeNameByEmail,
  getRefereesPostulatedForMatch,
  getMatchAssignments,
} from "@/lib/localStorage"; 
import { UserCheck, UserPlus, Edit, Trash2, Users, CalendarCheck2, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

interface ShiftTableProps {
  clubId: string; 
  definedMatchesForClub: ClubSpecificMatch[];
  allShiftRequestsForClub: ShiftRequest[];
  allClubReferees: User[]; // All referees in the admin's club
  initialMatchAssignments: MatchAssignment[]; // Pass initial assignments
}

interface AssignDialogState {
  open: boolean;
  matchToAssign: ClubSpecificMatch | null;
  postulatedRefereesForThisMatch: User[]; // Only users who postulated for THIS specific match
  currentAssignedEmail?: string;
}

interface PostulatedRefereeDetail {
  user: User;
  originalRequest: ShiftRequest; 
}

export default function ShiftTable({ 
  clubId, 
  definedMatchesForClub, 
  allShiftRequestsForClub, 
  allClubReferees,
  initialMatchAssignments
}: ShiftTableProps) {
  const { toast } = useToast();
  const [assignDialogState, setAssignDialogState] = useState<AssignDialogState>({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
  const [selectedRefereeForAssignment, setSelectedRefereeForAssignment] = useState<string>("");
  
  // State to hold current assignments, initialized and updated
  const [currentAssignments, setCurrentAssignments] = useState<MatchAssignment[]>(initialMatchAssignments);
  const [assignmentVersion, setAssignmentVersion] = useState(0); // To trigger re-renders/re-fetches

  useEffect(() => {
    // This effect re-fetches or re-filters assignments when assignmentVersion changes
    // or when initialMatchAssignments (if it were to change externally, though less common) or clubId changes.
    const clubAssignments = getMatchAssignments().filter(a => a.clubId === clubId);
    setCurrentAssignments(clubAssignments);
  }, [assignmentVersion, clubId, initialMatchAssignments]);


  const getPostulatedRefereesDetailsForSpecificMatch = useCallback((matchId: string): PostulatedRefereeDetail[] => {
    const details: PostulatedRefereeDetail[] = [];
    allShiftRequestsForClub.forEach(request => {
      if (request.clubId === clubId && request.status === 'pending' && request.selectedMatches.some(sm => sm.id === matchId)) {
        const user = allClubReferees.find(u => u.email === request.userEmail);
        if (user) {
          if (!details.find(d => d.user.email === user.email)) {
             details.push({ user, originalRequest: request });
          }
        }
      }
    });
    return details;
  }, [allShiftRequestsForClub, allClubReferees, clubId]);


  const getAssignmentForSpecificMatch = useCallback((matchId: string): MatchAssignment | undefined => {
    return currentAssignments.find(a => a.matchId === matchId);
  }, [currentAssignments]);


  const openAssignDialog = (match: ClubSpecificMatch) => {
    // Get users who specifically postulated for this match
    const postulatedUsers = getRefereesPostulatedForMatch(clubId, match.id);
    const currentAssignment = getAssignmentForSpecificMatch(match.id);

    if (postulatedUsers.length === 0 && !currentAssignment) {
       toast({ title: "Sin Postulantes Directos", description: `Nadie se postuló directamente para: ${match.description}. Puede asignar de la lista general del club si lo desea.`, variant: "default"});
       // If no one postulated, current logic shows an empty select or could be enhanced to show all club referees.
    }
    
    setAssignDialogState({
      open: true,
      matchToAssign: match,
      postulatedRefereesForThisMatch: postulatedUsers, 
      currentAssignedEmail: currentAssignment?.assignedRefereeEmail,
    });
    setSelectedRefereeForAssignment(currentAssignment?.assignedRefereeEmail || (postulatedUsers.length > 0 ? postulatedUsers[0].email : ""));
  };


  const handleAssignShift = () => {
    if (!assignDialogState.matchToAssign || !selectedRefereeForAssignment) {
      toast({ title: "Error", description: "Selecciona un árbitro y un partido.", variant: "destructive" });
      return;
    }

    // Prevent re-assigning the same referee if already assigned (unless it's a re-assignment flow)
    const currentAssignment = getAssignmentForSpecificMatch(assignDialogState.matchToAssign.id);
    if (currentAssignment && currentAssignment.assignedRefereeEmail === selectedRefereeForAssignment && assignDialogState.currentAssignedEmail === selectedRefereeForAssignment) {
        toast({ title: "Sin Cambios", description: "Este árbitro ya está asignado a este partido.", variant: "default" });
        setAssignDialogState({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
        setSelectedRefereeForAssignment("");
        return;
    }
    
    assignRefereeToMatch(clubId, assignDialogState.matchToAssign.id, selectedRefereeForAssignment);
    toast({
      title: "Árbitro Asignado",
      description: `${getRefereeNameByEmail(selectedRefereeForAssignment) || selectedRefereeForAssignment} ha sido asignado a ${assignDialogState.matchToAssign.description}.`,
    });
    setAssignDialogState({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
    setSelectedRefereeForAssignment("");
    setAssignmentVersion(v => v + 1); 
  };
  

  const handleUnassignShift = (matchId: string) => {
    const match = definedMatchesForClub.find(m => m.id === matchId);
    unassignRefereeFromMatch(clubId, matchId);
    toast({
      title: "Asignación Removida",
      description: `El árbitro ha sido desasignado de ${match?.description || 'este partido'}.`,
      variant: "default"
    });
    setAssignmentVersion(v => v + 1); 
  };

  if (definedMatchesForClub.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
        <p className="font-semibold">No hay partidos definidos para este club.</p>
        <p className="text-sm">Por favor, ve a la pestaña "Definir Partidos/Turnos" para añadir algunos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>
          Gestionar asignaciones para cada partido/turno definido para {getRefereeNameByEmail(clubId) || "el club"}. Mostrando {definedMatchesForClub.length} partidos.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline w-2/6"><CalendarCheck2 className="inline mr-1 h-4 w-4 text-primary" />Partido/Turno</TableHead>
            <TableHead className="font-headline w-3/6"><Users className="inline mr-1 h-4 w-4 text-primary" />Árbitros Postulados (y detalles)</TableHead>
            <TableHead className="font-headline text-right w-1/6">Estado / Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {definedMatchesForClub.map((match) => {
            const postulatedDetails = getPostulatedRefereesDetailsForSpecificMatch(match.id);
            const assignment = getAssignmentForSpecificMatch(match.id);
            const assignedRefereeName = assignment ? (getRefereeNameByEmail(assignment.assignedRefereeEmail) || assignment.assignedRefereeEmail) : null;

            return (
              <TableRow key={match.id}>
                <TableCell className="font-medium align-top pt-3">{match.description}</TableCell>
                <TableCell className="align-top pt-3">
                  {postulatedDetails.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {postulatedDetails.map(detail => (
                        <li key={detail.user.id} className="border-b border-dashed pb-1 last:border-b-0 last:pb-0">
                          <p className="font-semibold">{detail.user.name} <span className="text-muted-foreground">({detail.user.email})</span></p>
                          <div className="flex items-center text-xs">
                            <span className="mr-1">Auto:</span>
                            {detail.originalRequest.hasCar ? 
                              <Badge variant="default" className="bg-green-100 text-green-700">Sí</Badge> : 
                              <Badge variant="default" className="bg-red-100 text-red-700">No</Badge>}
                          </div>
                          {detail.originalRequest.notes && <p className="text-muted-foreground italic mt-0.5">Notas: {detail.originalRequest.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nadie se postuló para este partido/turno aún.</p>
                  )}
                </TableCell>
                <TableCell className="text-right align-top pt-3">
                  {assignment ? (
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="default" className="bg-primary text-primary-foreground text-xs whitespace-nowrap self-end mb-1">
                        <UserCheck className="mr-1 h-3 w-3" /> Asignado: {assignedRefereeName}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openAssignDialog(match)} className="h-7 px-2 py-1 text-xs whitespace-nowrap">
                          <Edit size={12} className="mr-1"/> Reasignar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleUnassignShift(match.id)} className="h-7 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 whitespace-nowrap">
                          <Trash2 size={12} className="mr-1"/> Quitar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant={postulatedDetails.length > 0 ? "default" : "outline"}
                      size="sm" 
                      onClick={() => openAssignDialog(match)} 
                      className="h-7 px-2 py-1 text-xs whitespace-nowrap"
                      disabled={postulatedDetails.length === 0} 
                    >
                      <UserPlus className="mr-1 h-3 w-3" /> Asignar Árbitro
                    </Button>
                  )}
                   {postulatedDetails.length === 0 && !assignment && (
                     <p className="text-xs text-muted-foreground mt-1 italic">Esperando postulantes.</p>
                   )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {assignDialogState.open && assignDialogState.matchToAssign && (
        <AlertDialog open={assignDialogState.open} onOpenChange={(open) => {
            if (!open) {
                setAssignDialogState({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
                setSelectedRefereeForAssignment("");
            }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Asignar Árbitro para: <span className="font-semibold">{assignDialogState.matchToAssign.description}</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                {assignDialogState.currentAssignedEmail && 
                  `Actualmente asignado a: ${getRefereeNameByEmail(assignDialogState.currentAssignedEmail) || assignDialogState.currentAssignedEmail}. `}
                {assignDialogState.postulatedRefereesForThisMatch.length > 0 
                  ? "Selecciona un árbitro de la lista de postulantes para este partido/turno." 
                  : "No hay árbitros postulados directamente para este partido. Puede seleccionar de la lista general del club o esperar postulaciones."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select 
                onValueChange={setSelectedRefereeForAssignment} 
                value={selectedRefereeForAssignment}
                disabled={assignDialogState.postulatedRefereesForThisMatch.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={assignDialogState.postulatedRefereesForThisMatch.length > 0 ? "Selecciona un árbitro postulado" : "No hay postulantes directos"} />
                </SelectTrigger>
                <SelectContent>
                  {assignDialogState.postulatedRefereesForThisMatch.map(referee => (
                    <SelectItem key={referee.id} value={referee.email}>
                      {referee.name} ({referee.email})
                    </SelectItem>
                  ))}
                  {assignDialogState.postulatedRefereesForThisMatch.length === 0 && (
                     <SelectItem value="no-postulantes" disabled>No hay árbitros postulados para este partido</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAssignShift} 
                className="bg-primary hover:bg-primary/90" 
                disabled={!selectedRefereeForAssignment || selectedRefereeForAssignment === "no-postulantes" || assignDialogState.postulatedRefereesForThisMatch.length === 0}>
                Confirmar Asignación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

