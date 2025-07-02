
'use client';

import { useState, useTransition } from "react";
import type { User } from "@/types";
import { promoteUserToAdmin, demoteAdminToReferee } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpCircle, ArrowDownCircle, ShieldCheck, User as UserIcon } from "lucide-react";

interface MembersManagerProps {
  clubId: string;
  members: User[];
  currentUserId: string;
}

export default function MembersManager({ clubId, members, currentUserId }: MembersManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleRoleChange = async (userIdToChange: string, newRole: 'admin' | 'referee') => {
        startTransition(async () => {
            const action = newRole === 'admin' ? promoteUserToAdmin : demoteAdminToReferee;
            const result = await action(clubId, userIdToChange);

            if (result.success) {
                toast({
                    title: "Rol Actualizado",
                    description: "El rol del miembro ha sido actualizado correctamente.",
                    variant: "success",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error al cambiar el rol",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Miembros de la Asociación</CardTitle>
        <CardDescription>
          Promueve árbitros al rol de administrador para que puedan ayudarte a gestionar la asociación, o revoca sus permisos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead className="text-right">Acción</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {members.map((member) => (
                <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                        {member.roleInClub === 'admin' ? (
                            <Badge variant="default" className="bg-primary/80">
                                <ShieldCheck className="mr-1 h-3 w-3"/>
                                Administrador
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <UserIcon className="mr-1 h-3 w-3"/>
                                Árbitro
                            </Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                    {member.id !== currentUserId && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                {member.roleInClub === 'referee' ? (
                                    <Button variant="outline" size="sm" disabled={isPending}>
                                        <ArrowUpCircle className="mr-2 h-4 w-4"/> Promover a Admin
                                    </Button>
                                ) : (
                                    <Button variant="destructive" size="sm" disabled={isPending}>
                                        <ArrowDownCircle className="mr-2 h-4 w-4"/> Revocar Admin
                                    </Button>
                                )}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {member.roleInClub === 'referee'
                                        ? `Estás a punto de promover a ${member.name} a Administrador. Tendrá acceso completo a todas las funciones de gestión.`
                                        : `Estás a punto de revocar los privilegios de Administrador de ${member.name}. Volverá a ser un Árbitro.`}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleRoleChange(member.id, member.roleInClub === 'referee' ? 'admin' : 'referee')}
                                        disabled={isPending}
                                        className={member.roleInClub === 'admin' ? 'bg-destructive hover:bg-destructive/90' : ''}
                                    >
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Confirmar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {member.id === currentUserId && (
                        <span className="text-xs text-muted-foreground italic"> (Tú) </span>
                    )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

