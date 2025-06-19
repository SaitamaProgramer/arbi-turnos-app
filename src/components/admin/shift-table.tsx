
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  updateShiftRequestStatus, 
  getAssignmentForMatch,
  assignRefereeToMatch,
  unassignRefereeFromMatch,
  getRefereesPostulatedForMatch,
  getRefereeNameByEmail,
  getRefereesByClubId
} from "@/lib/localStorage"; 
import { UserCheck, CheckCircle2, UserPlus, BadgeCheck, Hourglass, Mail, ListChecks, Users, Trash2, Edit } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShiftTableProps {
  requests: ShiftRequest[];
  onUpdateRequest: (updatedRequest: ShiftRequest) => void; 
  clubId: string; 
}

interface AssignDialogState {
  open: boolean;
  match: ClubSpecificMatch | null;
  shiftRequestUserEmail: string; // Email of the user who made the original ShiftRequest
  currentAssignedEmail?: string;
}

export default function ShiftTable({ requests, onUpdateRequest, clubId }: ShiftTableProps) {
  const { toast } = useToast();
  const [displayRequests, setDisplayRequests] = useState<ShiftRequest[]>([]);
  const [allClubReferees, setAllClubReferees] = useState<User[]>([]);
  const [assignDialogState, setAssignDialogState] = useState<AssignDialogState>({ open: false, match: null, shiftRequestUserEmail: "" });
  const [selectedRefereeForAssignment, setSelectedRefereeForAssignment] = useState<string>("");
  const [postulatedRefereesForDialog, setPostulatedRefereesForDialog] = useState<User[]>([]);

  useEffect(() => {
    const clubRequests = requests.filter(req => req.clubId === clubId);
    const sorted = [...clubRequests].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setDisplayRequests(sorted);
    setAllClubReferees(getRefereesByClubId(clubId));
  }, [requests, clubId]);
  
  // Memoized assignments fetching
  const matchAssignments = getMatchAssignments(); // Get all once, filter as needed or make getAssignmentForMatch efficient

  const getAssignment = useCallback((matchId: string): MatchAssignment | undefined => {
    return matchAssignments.find(a => a.clubId === clubId && a.matchId === matchId);
  }, [clubId, matchAssignments]);


  const openAssignDialog = (match: ClubSpecificMatch, shiftRequest: ShiftRequest) => {
    const assignment = getAssignment(match.id);
    const postulated = getRefereesPostulatedForMatch(clubId, match.id);
    
    let availableReferees = postulated.length > 0 ? postulated : allClubReferees;
    if (postulated.length === 0 && allClubReferees.length === 0) {
      availableReferees = []; // No one to assign
    }
    
    setPostulatedRefereesForDialog(availableReferees);
    setAssignDialogState({
      open: true,
      match: match,
      shiftRequestUserEmail: shiftRequest.userEmail,
      currentAssignedEmail: assignment?.assignedRefereeEmail,
    });
    setSelectedRefereeForAssignment(assignment?.assignedRefereeEmail || (availableReferees.length > 0 ? availableReferees[0].email : ""));
  };

  const handleAssignShift = () => {
    if (!assignDialogState.match || !selectedRefereeForAssignment) {
      toast({ title: "Error", description: "Selecciona un árbitro y un partido.", variant: "destructive" });
      return;
    }
    assignRefereeToMatch(clubId, assignDialogState.match.id, selectedRefereeForAssignment);
    toast({
      title: "Árbitro Asignado",
      description: `${getRefereeNameByEmail(selectedRefereeForAssignment) || selectedRefereeForAssignment} ha sido asignado a ${assignDialogState.match.description}.`,
    });
    setAssignDialogState({ open: false, match: null, shiftRequestUserEmail: "" });
    setSelectedRefereeForAssignment("");
    // Force re-render or state update to show new assignment
    // This might require a more direct state update or re-fetching assignments if not automatically reflecting
  };
  
  const handleUnassignShift = (matchId: string) => {
    const match = displayRequests.flatMap(r => r.selectedMatches).find(m => m.id === matchId);
    unassignRefereeFromMatch(clubId, matchId);
    toast({
      title: "Asignación Removida",
      description: `El árbitro ha sido desasignado de ${match?.description || 'este partido'}.`,
      variant: "default"
    });
     // Force re-render or state update
  }

  const handleMarkRequestAsCompleted = (id: string) => {
    const updatedRequest = updateShiftRequestStatus(id, "completed");
    if (updatedRequest) {
      onUpdateRequest(updatedRequest); 
      toast({
        title: "Postulación Marcada como Completada",
        description: "La postulación general ha sido marcada como completada.",
      });
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la postulación.", variant: "destructive" });
    }
  };

  const getRequestStatusBadge = (status: ShiftRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Hourglass className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="mr-1 h-3 w-3" />Completada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };
  
  if (displayRequests.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No hay postulaciones para tu club.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>Lista de postulaciones de árbitros. Mostrando {displayRequests.length} postulaciones.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline w-[150px]"><Mail className="inline mr-1 h-4 w-4 text-primary" />Email Postulante</TableHead>
            <TableHead className="font-headline"><ListChecks className="inline mr-1 h-4 w-4 text-primary" />Partidos Postulados y Estado Asignación</TableHead>
            <TableHead className="font-headline text-center">Auto</TableHead>
            <TableHead className="font-headline">Notas</TableHead>
            <TableHead className="font-headline">Enviado</TableHead>
            <TableHead className="font-headline">Estado Postulación</TableHead>
            <TableHead className="font-headline text-right w-[150px]">Acción Global</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="text-xs font-medium">{request.userEmail}</TableCell>
              <TableCell>
                {request.selectedMatches.length > 0 ? (
                  <ul className="space-y-3">
                    {request.selectedMatches.map(matchItem => {
                      const assignment = getAssignment(matchItem.id);
                      const assignedRefereeName = assignment ? (getRefereeNameByEmail(assignment.assignedRefereeEmail) || assignment.assignedRefereeEmail) : null;
                      return (
                        <li key={matchItem.id} className="py-1 border-b border-dashed border-border last:border-b-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{matchItem.description}</span>
                            {assignment ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                                  <UserCheck className="mr-1 h-3 w-3" /> Asignado a: {assignedRefereeName}
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => openAssignDialog(matchItem, request)} className="h-7 px-2 py-1 text-xs">
                                  <Edit size={12} className="mr-1"/> Reasignar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleUnassignShift(matchItem.id)} className="h-7 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                                  <Trash2 size={12} className="mr-1"/> Quitar
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => openAssignDialog(matchItem, request)} className="h-7 px-2 py-1 text-xs border-primary text-primary hover:bg-primary/10">
                                <UserPlus className="mr-1 h-3 w-3" /> Asignar Árbitro
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span className="text-sm text-muted-foreground">Ningún partido/turno específico en esta postulación.</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {request.hasCar ? 
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Sí</Badge> : 
                  <Badge variant="secondary" className="bg-red-100 text-red-700">No</Badge>
                }
              </TableCell>
              <TableCell className="max-w-[200px] break-words text-xs">{request.notes || "-"}</TableCell>
              <TableCell className="text-xs">{format(new Date(request.submittedAt), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
              <TableCell>{getRequestStatusBadge(request.status)}</TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => handleMarkRequestAsCompleted(request.id)} className="border-accent text-accent hover:bg-accent/10 text-xs">
                      <BadgeCheck className="mr-1 h-3 w-3" /> Marcar Completada
                    </Button>
                )}
                {request.status === "completed" && (
                  <span className="text-xs text-muted-foreground italic">Postulación Procesada</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {assignDialogState.open && assignDialogState.match && (
        <AlertDialog open={assignDialogState.open} onOpenChange={(open) => !open && setAssignDialogState({ open: false, match: null, shiftRequestUserEmail: "" })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Asignar Árbitro para: {assignDialogState.match.description}</AlertDialogTitle>
              <AlertDialogDescription>
                Selecciona un árbitro para asignar a este partido/turno. 
                {postulatedRefereesForDialog.length > 0 ? " Mostrando árbitros postulados o todos los del club." : " No hay árbitros postulados directamente, mostrando todos los del club."}
                 {assignDialogState.currentAssignedEmail && ` Actualmente asignado a: ${getRefereeNameByEmail(assignDialogState.currentAssignedEmail) || assignDialogState.currentAssignedEmail}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select onValueChange={setSelectedRefereeForAssignment} value={selectedRefereeForAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un árbitro" />
                </SelectTrigger>
                <SelectContent>
                  {postulatedRefereesForDialog.length > 0 ? (
                    postulatedRefereesForDialog.map(referee => (
                      <SelectItem key={referee.id} value={referee.email}>
                        {referee.name} ({referee.email})
                      </SelectItem>
                    ))
                  ) : allClubReferees.length > 0 ? (
                     allClubReferees.map(referee => (
                      <SelectItem key={referee.id} value={referee.email}>
                        {referee.name} ({referee.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-referees" disabled>No hay árbitros disponibles en el club</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setAssignDialogState({ open: false, match: null, shiftRequestUserEmail: "" }); setSelectedRefereeForAssignment(""); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAssignShift} className="bg-primary hover:bg-primary/90" disabled={!selectedRefereeForAssignment || selectedRefereeForAssignment === "no-referees"}>Confirmar Asignación</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
