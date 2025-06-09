"use client";

import type { ShiftRequest } from "@/types";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Car, CalendarDays, Clock, FileText, UserCheck, CheckCircle2, MoreHorizontal, UserPlus, BadgeCheck, ParkingCircleOff, Hourglass } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShiftTableProps {
  requests: ShiftRequest[];
  onUpdateRequest: (updatedRequest: ShiftRequest) => void;
}

export default function ShiftTable({ requests, onUpdateRequest }: ShiftTableProps) {
  const { toast } = useToast();
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [refereeName, setRefereeName] = useState("");
  const [sortedRequests, setSortedRequests] = useState<ShiftRequest[]>([]);

  useEffect(() => {
    const sorted = [...requests].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setSortedRequests(sorted);
  }, [requests]);

  const handleAssignShift = () => {
    if (!assigningRequestId || !refereeName.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingrese el nombre del árbitro.",
        variant: "destructive",
      });
      return;
    }
    const requestToUpdate = requests.find(req => req.id === assigningRequestId);
    if (requestToUpdate) {
      const updatedRequest: ShiftRequest = {
        ...requestToUpdate,
        status: "assigned",
        assignedRefereeName: refereeName.trim(),
      };
      onUpdateRequest(updatedRequest);
      toast({
        title: "Turno Asignado",
        description: `El turno ha sido asignado a ${refereeName.trim()}.`,
      });
    }
    setAssigningRequestId(null);
    setRefereeName("");
  };

  const handleMarkAsCompleted = (id: string) => {
    const requestToUpdate = requests.find(req => req.id === id);
    if (requestToUpdate) {
      const updatedRequest: ShiftRequest = {
        ...requestToUpdate,
        status: "completed",
      };
      onUpdateRequest(updatedRequest);
      toast({
        title: "Turno Completado",
        description: "El turno ha sido marcado como completado.",
      });
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
  
  if (sortedRequests.length === 0) {
    return <p className="text-center text-muted-foreground mt-8">No hay solicitudes de turno disponibles.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>Lista de solicitudes y turnos de árbitros. Mostrando {sortedRequests.length} registros.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline"><CalendarDays className="inline mr-1 h-4 w-4 text-primary" />Días</TableHead>
            <TableHead className="font-headline"><Clock className="inline mr-1 h-4 w-4 text-primary" />Horarios</TableHead>
            <TableHead className="font-headline"><Car className="inline mr-1 h-4 w-4 text-primary" />Auto</TableHead>
            <TableHead className="font-headline"><FileText className="inline mr-1 h-4 w-4 text-primary" />Notas</TableHead>
            <TableHead className="font-headline">Enviado</TableHead>
            <TableHead className="font-headline">Estado</TableHead>
            <TableHead className="font-headline">Árbitro Asignado</TableHead>
            <TableHead className="font-headline text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="max-w-[150px] break-words">{request.days.join(", ")}</TableCell>
              <TableCell className="max-w-[200px] break-words">{request.times.join(", ")}</TableCell>
              <TableCell>
                {request.hasCar ? <Car className="h-5 w-5 text-green-600" /> : <ParkingCircleOff className="h-5 w-5 text-red-500" />}
              </TableCell>
              <TableCell className="max-w-[250px] break-words text-sm">{request.notes || "-"}</TableCell>
              <TableCell>{format(new Date(request.submittedAt), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>{request.assignedRefereeName || "-"}</TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                  <AlertDialogTrigger asChild onSelect={() => setAssigningRequestId(request.id)}>
                    <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                      <UserPlus className="mr-2 h-4 w-4" /> Asignar
                    </Button>
                  </AlertDialogTrigger>
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
            <AlertDialogTitle>Asignar Árbitro al Turno</AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese el nombre del árbitro para asignar este turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del árbitro"
              value={refereeName}
              onChange={(e) => setRefereeName(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAssigningRequestId(null); setRefereeName(""); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignShift} className="bg-primary hover:bg-primary/90">Asignar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
