
"use client";

import type { ShiftRequestWithMatches, ClubSpecificMatch, User, MatchAssignment } from "@/types";
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
} from "@/lib/actions"; 
import { UserCheck, UserPlus, Edit, Trash2, Users, CalendarCheck2, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';

interface ShiftTableProps {
  clubId: string; 
  initialDefinedMatches: ClubSpecificMatch[];
  initialShiftRequests: ShiftRequestWithMatches[];
  initialClubReferees: User[]; 
  initialMatchAssignments: MatchAssignment[]; 
}

interface AssignDialogState {
  open: boolean;
  matchToAssign: ClubSpecificMatch | null;
}

interface PostulatedRefereeDetails {
  user: User;
  hasCar: boolean;
  notes?: string;
}

export default function ShiftTable({ 
  clubId, 
  initialDefinedMatches,
  initialShiftRequests,
  initialClubReferees,
  initialMatchAssignments
}: ShiftTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assignDialogState, setAssignDialogState] = useState<AssignDialogState>({ open: false, matchToAssign: null });
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>("");
  
  // These props will not update on their own after a server action. 
  // We use the initial props to populate state that we can then manage on the client.
  // The router.refresh() will cause the parent server component to re-render and pass new props.
  const [definedMatches, setDefinedMatches] = useState(initialDefinedMatches);
  const [shiftRequests, setShiftRequests] = useState(initialShiftRequests);
  const [assignments, setAssignments] = useState(initialMatchAssignments);
  
  const getRefereeNameById = (userId: string) => initialClubReferees.find(u => u.id === userId)?.name || 'Desconocido';

  const postulatedRefereesByMatchId = useMemo(() => {
    const map = new Map<string, PostulatedRefereeDetails[]>();
    for (const match of definedMatches) {
        const postulated = [];
        for (const request of shiftRequests) {
            if (request.selectedMatches.some(sm => sm.id === match.id)) {
                const user = initialClubReferees.find(u => u.id === request.userId);
                if (user) {
                    postulated.push({
                        user,
                        hasCar: request.hasCar,
                        notes: request.notes,
                    });
                }
            }
        }
        map.set(match.id, postulated);
    }
    return map;
  }, [definedMatches, shiftRequests, initialClubReferees]);

  const openAssignDialog = (match: ClubSpecificMatch) => {
    const currentAssignment = assignments.find(a => a.matchId === match.id);
    setSelectedRefereeId(currentAssignment?.assignedRefereeId || "");
    setAssignDialogState({
      open: true,
      matchToAssign: match,
    });
  };

  const handleAssignShift = () => {
    if (!assignDialogState.matchToAssign || !selectedRefereeId) {
      toast({ title: "Error de Selección", description: "Debes seleccionar un árbitro y un partido.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
        const result = await assignRefereeToMatch(clubId, assignDialogState.matchToAssign!.id, selectedRefereeId);
        
        if (result.success) {
          toast({
            title: "Árbitro Asignado",
            description: `${getRefereeNameById(selectedRefereeId) || selectedRefereeId} ha sido asignado.`,
          });
          router.refresh(); // Re-fetches server-side data and re-renders the component with new props
        } else {
          toast({
            title: "Error al Asignar",
            description: result.error || "No se pudo asignar el árbitro.",
            variant: "destructive",
          });
        }
        
        setAssignDialogState({ open: false, matchToAssign: null });
        setSelectedRefereeId("");
    });
  };
  
  const handleUnassignShift = (matchId: string) => {
    startTransition(async () => {
        const result = await unassignRefereeFromMatch(clubId, matchId);
        if (result.success) {
            toast({
              title: "Asignación Removida",
              description: `El árbitro ha sido desasignado de este partido.`,
            });
            router.refresh();
        } else {
            toast({
              title: "Error al Desasignar",
              description: result.error || "Ocurrió un error inesperado.",
              variant: "destructive"
            });
        }
    });
  };

  if (definedMatches.length === 0) {
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
          Gestionar asignaciones para cada partido/turno. Mostrando {definedMatches.length} partidos definidos.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline w-[30%]"><CalendarCheck2 className="inline mr-1 h-4 w-4 text-primary" />Partido/Turno (Fecha y Lugar)</TableHead>
            <TableHead className="font-headline w-[45%]"><Users className="inline mr-1 h-4 w-4 text-primary" />Árbitros Postulados y Detalles</TableHead>
            <TableHead className="font-headline text-right w-[25%]">Estado / Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {definedMatches.map((match) => {
            const postulatedRefereeDetails = postulatedRefereesByMatchId.get(match.id) || [];
            const assignment = assignments.find(a => a.matchId === match.id);
            const assignedRefereeName = assignment ? getRefereeNameById(assignment.assignedRefereeId) : null;

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
                        <Button variant="outline" size="sm" onClick={() => openAssignDialog(match)} className="h-7 px-2 py-1 text-xs whitespace-nowrap" disabled={isPending}>
                          <Edit size={12} className="mr-1"/> Reasignar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleUnassignShift(match.id)} className="h-7 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 whitespace-nowrap" disabled={isPending}>
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
                      disabled={postulatedRefereeDetails.length === 0 || isPending} 
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
                setAssignDialogState({ open: false, matchToAssign: null });
                setSelectedRefereeId("");
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
                Selecciona un árbitro de la lista de postulantes para este partido/turno.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Select 
                onValueChange={setSelectedRefereeId} 
                value={selectedRefereeId}
                disabled={ (postulatedRefereesByMatchId.get(assignDialogState.matchToAssign.id) || []).length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un árbitro postulado" />
                </SelectTrigger>
                <SelectContent>
                  {(postulatedRefereesByMatchId.get(assignDialogState.matchToAssign.id) || []).map(detail => (
                    <SelectItem key={detail.user.id} value={detail.user.id}>
                      {detail.user.name} ({detail.user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAssignShift} 
                className="bg-primary hover:bg-primary/90" 
                disabled={!selectedRefereeId || isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Confirmar Asignación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
