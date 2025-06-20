
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
import { format, parseISO } from 'date-fns';

interface ShiftTableProps {
  clubId: string; 
  definedMatchesForClub: ClubSpecificMatch[];
  allShiftRequestsForClub: ShiftRequest[]; // Still needed to find who postulated for what
  allClubReferees: User[]; 
  initialMatchAssignments: MatchAssignment[]; 
}

interface AssignDialogState {
  open: boolean;
  matchToAssign: ClubSpecificMatch | null;
  postulatedRefereesForThisMatch: User[]; 
  currentAssignedEmail?: string;
}

interface PostulatedRefereeDetails {
  user: User;
  hasCar: boolean;
  notes?: string;
}

export default function ShiftTable({ 
  clubId, 
  definedMatchesForClub, 
  allShiftRequestsForClub,
  allClubReferees, // Not directly used in table rows, but useful for general listing if needed
  initialMatchAssignments
}: ShiftTableProps) {
  const { toast } = useToast();
  const [assignDialogState, setAssignDialogState] = useState<AssignDialogState>({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
  const [selectedRefereeForAssignment, setSelectedRefereeForAssignment] = useState<string>("");
  const [currentAssignments, setCurrentAssignments] = useState<MatchAssignment[]>(initialMatchAssignments);
  const [assignmentVersion, setAssignmentVersion] = useState(0);

  useEffect(() => {
    const clubAssignments = getMatchAssignments().filter(a => a.clubId === clubId);
    setCurrentAssignments(clubAssignments);
  }, [assignmentVersion, clubId, initialMatchAssignments]);

  const getPostulatedRefereesForSpecificMatchWithDetails = useCallback((matchId: string): PostulatedRefereeDetails[] => {
    const detailsMap = new Map<string, PostulatedRefereeDetails>();

    allShiftRequestsForClub.forEach(request => {
      if (request.clubId === clubId && request.selectedMatches.some(sm => sm.id === matchId)) {
        const user = allClubReferees.find(u => u.email === request.userEmail);
        if (user && !detailsMap.has(user.email)) { // Add only once per user, using their latest postulation details
          detailsMap.set(user.email, {
            user,
            hasCar: request.hasCar,
            notes: request.notes,
          });
        }
      }
    });
    return Array.from(detailsMap.values());
  }, [allShiftRequestsForClub, allClubReferees, clubId]);

  const getAssignmentForSpecificMatch = useCallback((matchId: string): MatchAssignment | undefined => {
    return currentAssignments.find(a => a.matchId === matchId);
  }, [currentAssignments]);

  const openAssignDialog = (match: ClubSpecificMatch) => {
    const postulatedUsers = getRefereesPostulatedForMatch(clubId, match.id); // Get users who postulated
    const currentAssignment = getAssignmentForSpecificMatch(match.id);
    
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
      toast({ title: "Error de Selección", description: "Debes seleccionar un árbitro y un partido.", variant: "destructive" });
      return;
    }

    const result = assignRefereeToMatch(clubId, assignDialogState.matchToAssign.id, selectedRefereeForAssignment);
    
    if (result.success && result.assignment) {
      toast({
        title: "Árbitro Asignado",
        description: `${getRefereeNameByEmail(selectedRefereeForAssignment) || selectedRefereeForAssignment} ha sido asignado a ${assignDialogState.matchToAssign.description}.`,
      });
      setAssignmentVersion(v => v + 1);
    } else {
      toast({
        title: "Error al Asignar",
        description: result.message || "No se pudo asignar el árbitro. Puede que ya tenga un conflicto de horario.",
        variant: "destructive",
      });
    }
    
    setAssignDialogState({ open: false, matchToAssign: null, postulatedRefereesForThisMatch: [] });
    setSelectedRefereeForAssignment("");
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
          Gestionar asignaciones para cada partido/turno. Mostrando {definedMatchesForClub.length} partidos definidos.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline w-[30%]"><CalendarCheck2 className="inline mr-1 h-4 w-4 text-primary" />Partido/Turno (Fecha y Lugar)</TableHead>
            <TableHead className="font-headline w-[45%]"><Users className="inline mr-1 h-4 w-4 text-primary" />Árbitros Postulados y Detalles</TableHead>
            <TableHead className="font-headline text-right w-[25%]">Estado / Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {definedMatchesForClub.map((match) => {
            const postulatedRefereeDetails = getPostulatedRefereesForSpecificMatchWithDetails(match.id);
            const assignment = getAssignmentForSpecificMatch(match.id);
            const assignedRefereeName = assignment ? (getRefereeNameByEmail(assignment.assignedRefereeEmail) || assignment.assignedRefereeEmail) : null;

            return (
              <TableRow key={match.id}>
                <TableCell className="font-medium align-top pt-3">
                  <p className="font-semibold">{match.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(match.date), "dd/MM/yyyy")} a las {match.time} hs.
                  </p>
                  <p className="text-xs text-muted-foreground">Lugar: {match.location}</p>
                </TableCell>
                <TableCell className="align-top pt-3">
                  {postulatedRefereeDetails.length > 0 ? (
                    <ul className="space-y-2 text-xs max-h-40 overflow-y-auto pr-2">
                      {postulatedRefereeDetails.map(detail => (
                        <li key={detail.user.id} className="border-b border-dashed pb-1.5 last:border-b-0 last:pb-0">
                          <p className="font-semibold text-sm">{detail.user.name} <span className="text-muted-foreground">({detail.user.email})</span></p>
                          <div className="flex items-center text-xs mt-0.5">
                            <span className="mr-1 font-medium">Auto:</span>
                            {detail.hasCar ? 
                              <Badge variant="default" className="bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px]">Sí</Badge> : 
                              <Badge variant="default" className="bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px]">No</Badge>}
                          </div>
                          {detail.notes && <p className="text-muted-foreground italic mt-0.5 text-[11px]">Notas: {detail.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nadie se postuló para este partido/turno aún.</p>
                  )}
                </TableCell>
                <TableCell className="text-right align-top pt-3">
                  {assignment ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="default" className="bg-primary text-primary-foreground text-xs whitespace-nowrap self-end mb-1 px-2 py-1">
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
                      variant={postulatedRefereeDetails.length > 0 ? "default" : "outline"}
                      size="sm" 
                      onClick={() => openAssignDialog(match)} 
                      className="h-7 px-2 py-1 text-xs whitespace-nowrap"
                      disabled={postulatedRefereeDetails.length === 0} 
                    >
                      <UserPlus className="mr-1 h-3 w-3" /> Asignar Árbitro
                    </Button>
                  )}
                   {postulatedRefereeDetails.length === 0 && !assignment && (
                     <p className="text-xs text-muted-foreground mt-1 italic text-right">Esperando postulantes.</p>
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
                <p className="text-sm text-muted-foreground font-normal">
                    {format(parseISO(assignDialogState.matchToAssign.date), "dd/MM/yyyy")} a las {assignDialogState.matchToAssign.time} hs. en {assignDialogState.matchToAssign.location}
                </p>
              </AlertDialogTitle>
              <AlertDialogDescription>
                {assignDialogState.currentAssignedEmail && 
                  `Actualmente asignado a: ${getRefereeNameByEmail(assignDialogState.currentAssignedEmail) || assignDialogState.currentAssignedEmail}. `}
                {assignDialogState.postulatedRefereesForThisMatch.length > 0 
                  ? "Selecciona un árbitro de la lista de postulantes para este partido/turno." 
                  : "No hay árbitros postulados directamente para este partido. Solo puedes asignar árbitros que se hayan postulado."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select 
                onValueChange={setSelectedRefereeForAssignment} 
                value={selectedRefereeForAssignment}
                disabled={assignDialogState.postulatedRefereesForThisMatch.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                      assignDialogState.postulatedRefereesForThisMatch.length > 0 
                        ? "Selecciona un árbitro postulado" 
                        : "No hay postulantes directos"
                    } />
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

