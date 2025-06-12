
"use client";

import type { ShiftRequest, ClubSpecificMatch } from "@/types";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateShiftRequestStatus } from "@/lib/localStorage"; 
import { Car, FileText, UserCheck, CheckCircle2, UserPlus, BadgeCheck, ParkingCircleOff, Hourglass, Mail, ListChecks } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShiftTableProps {
  requests: ShiftRequest[];
  onUpdateRequest: (updatedRequest: ShiftRequest) => void; 
  clubId: string; 
}

export default function ShiftTable({ requests, onUpdateRequest, clubId }: ShiftTableProps) {
  const { toast } = useToast();
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [assigningRequestEmail, setAssigningRequestEmail] = useState<string>(""); // Store email of user being assigned
  const [displayRequests, setDisplayRequests] = useState<ShiftRequest[]>([]);

  useEffect(() => {
    const clubRequests = requests.filter(req => req.clubId === clubId);
    const sorted = [...clubRequests].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setDisplayRequests(sorted);
  }, [requests, clubId]);

  const openAssignDialog = (request: ShiftRequest) => {
    setAssigningRequestId(request.id);
    // Pre-fill with the user who submitted the request, admin can override if needed
    // For this model, assignment is to the user who applied.
    const user = request.userEmail.split('@')[0]; // Simple name extraction
    setAssigningRequestEmail(user); 
  };

  const handleAssignShift = () => {
    if (!assigningRequestId || !assigningRequestEmail.trim()) { // Check against assigningRequestEmail now
      toast({
        title: "Error",
        description: "No se pudo determinar a quién asignar.", // Simplified message
        variant: "destructive",
      });
      return;
    }
    
    // The name assigned is now implicitly the user who made the request, or could be typed if needed
    // For simplicity, we use the email from the request, or a typed name
    const requestToAssign = displayRequests.find(r => r.id === assigningRequestId);
    if (!requestToAssign) {
        toast({ title: "Error", description: "No se encontró la solicitud.", variant: "destructive" });
        return;
    }

    // In this model, the "assignedRefereeName" is the person who submitted the postulation.
    // The dialog could allow overriding, but for now, it's the applicant.
    const nameToAssign = assigningRequestEmail; // Or requestToAssign.userEmail.split('@')[0] for the applicant

    const updatedRequest = updateShiftRequestStatus(assigningRequestId, "assigned", nameToAssign);

    if (updatedRequest) {
      onUpdateRequest(updatedRequest); 
      toast({
        title: "Postulación Marcada como Asignada",
        description: `La postulación de ${nameToAssign} ha sido marcada como asignada.`,
      });
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la postulación.", variant: "destructive" });
    }
    setAssigningRequestId(null);
    setAssigningRequestEmail("");
  };

  const handleMarkAsCompleted = (id: string) => {
    const updatedRequest = updateShiftRequestStatus(id, "completed");
    if (updatedRequest) {
      onUpdateRequest(updatedRequest); 
      toast({
        title: "Postulación Completada",
        description: "La postulación ha sido marcada como completada.",
      });
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la postulación.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: ShiftRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Hourglass className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'assigned':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-300"><UserCheck className="mr-1 h-3 w-3" />Asignado</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="mr-1 h-3 w-3" />Completado</Badge>;
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
        <TableCaption>Lista de postulaciones de árbitros para tu club. Mostrando {displayRequests.length} registros.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline"><Mail className="inline mr-1 h-4 w-4 text-primary" />Email Postulante</TableHead>
            <TableHead className="font-headline"><ListChecks className="inline mr-1 h-4 w-4 text-primary" />Partidos Postulados</TableHead>
            <TableHead className="font-headline"><Car className="inline mr-1 h-4 w-4 text-primary" />Auto</TableHead>
            <TableHead className="font-headline"><FileText className="inline mr-1 h-4 w-4 text-primary" />Notas</TableHead>
            <TableHead className="font-headline">Enviado</TableHead>
            <TableHead className="font-headline">Estado</TableHead>
            <TableHead className="font-headline">Árbitro Asignado</TableHead>
            <TableHead className="font-headline text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="text-xs">{request.userEmail}</TableCell>
              <TableCell className="max-w-[300px] break-words">
                {request.selectedMatches.length > 0 
                  ? request.selectedMatches.map(m => m.description).join("; ") 
                  : "Ninguno"}
              </TableCell>
              <TableCell>
                {request.hasCar ? <Car className="h-5 w-5 text-green-600" /> : <ParkingCircleOff className="h-5 w-5 text-red-500" />}
              </TableCell>
              <TableCell className="max-w-[250px] break-words text-sm">{request.notes || "-"}</TableCell>
              <TableCell>{format(new Date(request.submittedAt), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>{request.assignedRefereeName || "-"}</TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                    <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" onClick={() => openAssignDialog(request)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Asignar
                    </Button>
                )}
                {request.status === "assigned" && (
                  <Button variant="outline" size="sm" onClick={() => handleMarkAsCompleted(request.id)} className="border-accent text-accent hover:bg-accent/10">
                    <BadgeCheck className="mr-2 h-4 w-4" /> Completar
                  </Button>
                )}
                {request.status === "completed" && (
                  <span className="text-sm text-muted-foreground italic">Finalizado</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AlertDialog open={!!assigningRequestId} onOpenChange={(open) => !open && setAssigningRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar Postulación como Asignada</AlertDialogTitle>
            <AlertDialogDescription>
              Estás marcando esta postulación como asignada al árbitro: <strong>{assigningRequestEmail}</strong>.
              Esto implica que ha sido considerado para los partidos/turnos a los que se postuló.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Input field for referee name removed for simplicity, as assignment is to applicant */}
          {/* <div className="py-4">
            <Input
              placeholder="Nombre del árbitro (generalmente el postulante)"
              value={assigningRequestEmail}
              onChange={(e) => setAssigningRequestEmail(e.target.value)}
              autoFocus
            />
          </div> */}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAssigningRequestId(null); setAssigningRequestEmail(""); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignShift} className="bg-primary hover:bg-primary/90">Confirmar Asignación</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
