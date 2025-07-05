
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setAssignmentsForRole } from "@/lib/actions"; 
import { UserCheck, Users, CalendarCheck2, AlertTriangle, Loader2, CheckCircle, XCircle, Clock, Ban, UserPlus2, UserCog2, Share2, CarIcon } from "lucide-react";
import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AssignmentsPublicationView } from "./assignments-publication-view";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ShiftTableProps {
  clubId: string; 
  clubName: string;
  initialDefinedMatches: ClubSpecificMatch[];
  initialShiftRequests: ShiftRequestWithMatches[];
  initialClubMembers: User[]; 
  initialMatchAssignments: MatchAssignment[]; 
}

interface AssignDialogState {
  open: boolean;
  matchToAssign: ClubSpecificMatch | null;
  role: 'referee' | 'assistant';
}

interface PostulatedRefereeDetails {
  user: User;
  hasCar: boolean;
  notes?: string;
}

const MatchStatusBadge = ({ status, text, icon, className }: { status: string, text: string, icon: React.ReactNode, className: string }) => (
  <Badge variant="outline" className={cn("text-xs whitespace-nowrap", className)}>
    {icon} {text}
  </Badge>
);

const AssignedUsersList = ({ users, role }: { users: User[], role: 'Árbitro' | 'Asistente' }) => (
  <div className="mt-1">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{role}{users.length > 1 ? 's' : ''} Asignado{users.length > 1 ? 's' : ''}:</h4>
      <div className="flex flex-wrap gap-1 mt-1">
          {users.map(user => (
              <Badge key={user.id} variant="secondary" className="text-xs font-normal">
                  <UserCheck className="mr-1 h-3 w-3" />
                  {user.name}
              </Badge>
          ))}
      </div>
  </div>
);


export default function ShiftTable({ 
  clubId, 
  clubName,
  initialDefinedMatches,
  initialShiftRequests,
  initialClubMembers,
  initialMatchAssignments
}: ShiftTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assignDialogState, setAssignDialogState] = useState<AssignDialogState>({ open: false, matchToAssign: null, role: 'referee' });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const [definedMatches, setDefinedMatches] = useState<ClubSpecificMatch[]>([]);
  const [assignments, setAssignments] = useState<MatchAssignment[]>([]);
  
  const [pastMatchIds, setPastMatchIds] = useState(new Set<string>());

  useEffect(() => {
    const validMatches = Array.isArray(initialDefinedMatches) ? initialDefinedMatches : [];
    const sortedMatches = [...validMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDefinedMatches(sortedMatches);

    setAssignments(Array.isArray(initialMatchAssignments) ? initialMatchAssignments : []);

    const today = startOfDay(new Date());
    const pastIds = new Set<string>();
    validMatches.forEach(match => {
        if (isBefore(parseISO(match.date), today)) {
            pastIds.add(match.id);
        }
    });
    setPastMatchIds(pastIds);

  }, [initialDefinedMatches, initialMatchAssignments]);
  
  const getMemberById = (userId: string) => (Array.isArray(initialClubMembers) ? initialClubMembers : []).find(u => u.id === userId);

  const postulatedRefereesByMatchId = useMemo(() => {
    const map = new Map<string, PostulatedRefereeDetails[]>();
    const validShiftRequests = Array.isArray(initialShiftRequests) ? initialShiftRequests : [];
    const validClubMembers = Array.isArray(initialClubMembers) ? initialClubMembers : [];

    for (const match of definedMatches) {
        const postulated = [];
        for (const request of validShiftRequests) {
            if (request.selectedMatches.some(sm => sm.id === match.id)) {
                const user = validClubMembers.find(u => u.id === request.userId);
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
  }, [definedMatches, initialShiftRequests, initialClubMembers]);

  const openAssignDialog = (match: ClubSpecificMatch, role: 'referee' | 'assistant') => {
    const currentlyAssigned = assignments
      .filter(a => a.matchId === match.id && a.assignmentRole === role)
      .map(a => a.assignedRefereeId);
    
    setSelectedUserIds(currentlyAssigned);
    setAssignDialogState({
      open: true,
      matchToAssign: match,
      role: role
    });
  };

  const handleAssignAction = () => {
    if (!assignDialogState.matchToAssign) return;

    startTransition(async () => {
        const { matchToAssign, role } = assignDialogState;
        const result = await setAssignmentsForRole(clubId, matchToAssign.id, selectedUserIds, role);
        
        if (result.success) {
          toast({
            title: "Asignación Actualizada",
            description: `Se han guardado los ${role === 'referee' ? 'árbitros' : 'asistentes'} para el partido.`,
            variant: 'success'
          });
          router.refresh(); 
        } else {
          toast({
            title: "Error al Asignar",
            description: result.error || "No se pudo guardar la asignación.",
            variant: "destructive",
          });
        }
        
        setAssignDialogState({ open: false, matchToAssign: null, role: 'referee' });
        setSelectedUserIds([]);
    });
  };

  if (definedMatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
        <p className="font-semibold">No hay partidos definidos para esta asociación.</p>
        <p className="text-sm">Por favor, ve a la pestaña "Definir Partidos/Turnos" para añadir algunos.</p>
      </div>
    );
  }

  const renderStatusBadges = (match: ClubSpecificMatch, assignmentsForMatch: MatchAssignment[]) => {
      const isPast = pastMatchIds.has(match.id);
      if (isPast) {
          if (match.status === 'cancelled') return <MatchStatusBadge status="cancelled" text="Cancelado" icon={<Ban className="mr-1 h-3 w-3"/>} className="border-destructive text-destructive" />;
          if (assignmentsForMatch.length > 0) return <MatchStatusBadge status="played" text="Finalizado" icon={<CheckCircle className="mr-1 h-3 w-3"/>} className="border-green-600 text-green-600"/>;
          return <MatchStatusBadge status="expired" text="Expirado" icon={<XCircle className="mr-1 h-3 w-3"/>} className="border-muted-foreground text-muted-foreground"/>;
      }
      if (match.status === 'cancelled') return <MatchStatusBadge status="cancelled" text="Cancelado" icon={<Ban className="mr-1 h-3 w-3"/>} className="border-destructive text-destructive" />;
      if (match.status === 'postponed') return <MatchStatusBadge status="postponed" text="Pospuesto" icon={<Clock className="mr-1 h-3 w-3"/>} className="border-yellow-600 text-yellow-600"/>;
      return null;
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    Publicar / Compartir
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Publicar Asignaciones</DialogTitle>
                    <DialogDescription>
                        Aquí puedes generar una vista limpia de las asignaciones para imprimir o compartir.
                        Solo se mostrarán los partidos futuros con estado "Programado".
                    </DialogDescription>
                </DialogHeader>
                <AssignmentsPublicationView
                    clubName={clubName}
                    definedMatches={Array.isArray(initialDefinedMatches) ? initialDefinedMatches : []}
                    clubMembers={Array.isArray(initialClubMembers) ? initialClubMembers : []}
                    matchAssignments={Array.isArray(initialMatchAssignments) ? initialMatchAssignments : []}
                />
            </DialogContent>
        </Dialog>
      </div>

      {/* Mobile View */}
      <div className="space-y-4 md:hidden">
        {definedMatches.map(match => {
          const postulatedRefereeDetails = postulatedRefereesByMatchId.get(match.id) || [];
          const matchAssignments = assignments.filter(a => a.matchId === match.id);
          const assignedReferees = matchAssignments.filter(a => a.assignmentRole === 'referee').map(a => getMemberById(a.assignedRefereeId)).filter(Boolean) as User[];
          const assignedAssistants = matchAssignments.filter(a => a.assignmentRole === 'assistant').map(a => getMemberById(a.assignedRefereeId)).filter(Boolean) as User[];
          const isActionsDisabled = pastMatchIds.has(match.id) || match.status === 'cancelled';
          const isPostponed = match.status === 'postponed';

          return (
            <Card key={`mobile-${match.id}`} className={cn(isActionsDisabled && "bg-muted/40 opacity-80")}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base">{match.description}</CardTitle>
                  <div className="shrink-0">{renderStatusBadges(match, matchAssignments)}</div>
                </div>
                <CardDescription className="text-xs">
                  {format(parseISO(match.date), "dd/MM/yyyy", { locale: es })} a las {match.time} hs. en {match.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Postulados ({postulatedRefereeDetails.length})</h4>
                  {postulatedRefereeDetails.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {postulatedRefereeDetails.map(detail => (
                        <div key={detail.user.id} className="text-xs border-b border-dashed pb-1.5 last:border-b-0">
                          <p className="font-semibold">{detail.user.name}</p>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span><CarIcon size={12} className="inline mr-1"/> Auto: {detail.hasCar ? 'Sí' : 'No'}</span>
                            {detail.notes && <p className="italic text-sm">| Notas: {detail.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground italic">Nadie se postuló para este partido.</p>}
                </div>

                <div className="space-y-2">
                  {assignedReferees.length > 0 && <AssignedUsersList users={assignedReferees} role="Árbitro" />}
                  {assignedAssistants.length > 0 && <AssignedUsersList users={assignedAssistants} role="Asistente" />}
                </div>

                {!isActionsDisabled && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-dashed">
                      <Button variant="default" size="sm" onClick={() => openAssignDialog(match, 'referee')} disabled={isPending || isPostponed}>
                          <UserPlus2 className="mr-1 h-4 w-4" /> Gestionar Árbitros
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(match, 'assistant')} disabled={isPending || isPostponed}>
                          <UserCog2 className="mr-1 h-4 w-4" /> Gestionar Asistentes
                      </Button>
                  </div>
                )}
                 {isPostponed && <p className="text-xs text-muted-foreground mt-1 italic">Las asignaciones se habilitarán cuando se programe una nueva fecha.</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableCaption>
            Gestionar asignaciones para cada partido/turno. Mostrando {definedMatches.length} partidos definidos.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline w-[30%]"><CalendarCheck2 className="inline mr-1 h-4 w-4 text-primary" />Partido/Turno</TableHead>
              <TableHead className="font-headline w-[45%]"><Users className="inline mr-1 h-4 w-4 text-primary" />Postulados</TableHead>
              <TableHead className="font-headline text-right w-[25%]">Estado / Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definedMatches.map((match) => {
              const postulatedRefereeDetails = postulatedRefereesByMatchId.get(match.id) || [];
              const matchAssignments = assignments.filter(a => a.matchId === match.id);
              const assignedReferees = matchAssignments.filter(a => a.assignmentRole === 'referee').map(a => getMemberById(a.assignedRefereeId)).filter(Boolean) as User[];
              const assignedAssistants = matchAssignments.filter(a => a.assignmentRole === 'assistant').map(a => getMemberById(a.assignedRefereeId)).filter(Boolean) as User[];
              const isActionsDisabled = pastMatchIds.has(match.id) || match.status === 'cancelled';
              const isPostponed = match.status === 'postponed';

              return (
                <TableRow key={match.id} className={cn(isActionsDisabled && "bg-muted/40 opacity-70")}>
                  <TableCell className="font-medium align-top pt-3">
                    <p className="font-semibold">{match.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(match.date), "dd/MM/yyyy", { locale: es })} a las {match.time} hs.
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
                            {detail.notes && <p className="text-muted-foreground italic mt-1 text-sm">Notas: {detail.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nadie se postuló para este partido/turno aún.</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top pt-3 space-y-2">
                    <div className="flex flex-col items-end gap-1.5">
                      {renderStatusBadges(match, matchAssignments)}
                      <div className="space-y-2 text-left w-full">
                        {assignedReferees.length > 0 && <AssignedUsersList users={assignedReferees} role="Árbitro" />}
                        {assignedAssistants.length > 0 && <AssignedUsersList users={assignedAssistants} role="Asistente" />}
                      </div>
                    </div>
                    {!isActionsDisabled && (
                        <div className="flex flex-col items-end gap-1 pt-2 border-t border-dashed mt-2">
                            <Button variant="default" size="sm" onClick={() => openAssignDialog(match, 'referee')} className="h-7 px-2 py-1 text-xs whitespace-nowrap" disabled={isPending || isPostponed}>
                              <UserPlus2 className="mr-1 h-3 w-3" /> Gestionar Árbitros
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openAssignDialog(match, 'assistant')} className="h-7 px-2 py-1 text-xs whitespace-nowrap" disabled={isPending || isPostponed}>
                              <UserCog2 className="mr-1 h-3 w-3" /> Gestionar Asistentes
                            </Button>
                        </div>
                    )}
                    {isPostponed && <p className="text-xs text-muted-foreground mt-1 italic text-right">Las asignaciones se habilitarán cuando se programe una nueva fecha.</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {assignDialogState.open && assignDialogState.matchToAssign && (
        <Dialog open={assignDialogState.open} onOpenChange={(open) => {
            if (!open) {
                setAssignDialogState({ open: false, matchToAssign: null, role: 'referee' });
                setSelectedUserIds([]);
            }
        }}>
          <DialogContent className="sm:max-w-md">
            {!assignDialogState.matchToAssign ? null : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    Gestionar {assignDialogState.role === 'referee' ? 'Árbitros' : 'Asistentes'}
                  </DialogTitle>
                  <DialogDescription>
                    Para: <span className="font-semibold">{assignDialogState.matchToAssign.description}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <p className="text-sm font-medium mb-2">Selecciona los miembros postulados (máx. 6):</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border rounded-md p-3">
                    {(postulatedRefereesByMatchId.get(assignDialogState.matchToAssign.id) || []).map(detail => {
                      const isChecked = selectedUserIds.includes(detail.user.id);
                      const isDisabled = !isChecked && selectedUserIds.length >= 6;
                      
                      return (
                        <div key={detail.user.id} className={cn("flex items-center space-x-2", isDisabled && "opacity-50")}>
                          <Checkbox
                            id={`user-${detail.user.id}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => {
                              setSelectedUserIds(prev =>
                                checked
                                  ? [...prev, detail.user.id]
                                  : prev.filter(id => id !== detail.user.id)
                              );
                            }}
                          />
                          <Label htmlFor={`user-${detail.user.id}`} className={cn("font-normal", isDisabled && "cursor-not-allowed")}>
                            {detail.user.name}
                          </Label>
                        </div>
                      )
                    })}
                    {(postulatedRefereesByMatchId.get(assignDialogState.matchToAssign.id) || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No hay miembros postulados para este partido.</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button>
                  </DialogClose>
                  <Button onClick={handleAssignAction} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirmar Asignación
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
