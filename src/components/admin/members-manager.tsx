
'use client';

import { useState, useTransition } from "react";
import type { User } from "@/types";
import { promoteUserToAdmin, demoteAdminToReferee, deleteMemberFromClub } from "@/lib/actions";
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
import { Loader2, ArrowUpCircle, ArrowDownCircle, ShieldCheck, User as UserIcon, Trash2 } from "lucide-react";

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
    
    const handleDeleteMember = async (userIdToDelete: string) => {
      startTransition(async () => {
        const result = await deleteMemberFromClub(clubId, userIdToDelete);
        if (result.success) {
          toast({
            title: "Miembro Eliminado",
            description: "El miembro ha sido eliminado de la asociación.",
            variant: "success"
          });
          router.refresh();
        } else {
          toast({
            title: "Error al Eliminar",
            description: result.error,
            variant: "destructive"
          });
        }
      });
    };

    const ActionButtonDialog = ({ member }: { member: User }) => (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {member.roleInClub === 'referee' ? (
            <Button variant="outline" size="sm" disabled={isPending} className="w-full">
              <ArrowUpCircle className="mr-2 h-4 w-4"/> Promover a Admin
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={isPending} className="w-full">
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
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    const DeleteMemberDialog = ({ member }: { member: User }) => (
      <AlertDialog>
          <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending} className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción es irreversible. Estás a punto de eliminar a <strong>{member.name}</strong> de tu asociación. 
                      Se borrarán todas sus postulaciones y asignaciones.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteMember(member.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sí, eliminar miembro
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
  );


  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Miembros de la Asociación</CardTitle>
        <CardDescription>
          Promueve árbitros a administradores, revoca permisos o elimina miembros de la asociación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View */}
        <div className="space-y-4 md:hidden">
          {members.map((member) => (
            <div key={member.id} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                 {member.roleInClub === 'admin' ? (
                    <Badge variant="default" className="bg-primary/80 text-xs shrink-0">
                        <ShieldCheck className="mr-1 h-3 w-3"/>
                        Admin
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs shrink-0">
                        <UserIcon className="mr-1 h-3 w-3"/>
                        Árbitro
                    </Badge>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-dashed flex flex-col sm:flex-row gap-2">
                {member.id !== currentUserId ? (
                  <>
                    <ActionButtonDialog member={member} />
                    <DeleteMemberDialog member={member} />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic w-full text-center sm:text-right"> (Tú) </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden rounded-lg border md:block">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                      <div className="flex gap-2 justify-end">
                        {member.id !== currentUserId ? (
                          <>
                            <ActionButtonDialog member={member} />
                            <DeleteMemberDialog member={member} />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic px-3 py-1.5"> (Tú) </span>
                        )}
                      </div>
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
