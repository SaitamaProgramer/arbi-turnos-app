
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  submitAvailability,
  updateAvailability
} from "@/lib/actions";
import { isMatchEditable, isPostulationEditable } from "@/lib/utils";
import type { User, ClubSpecificMatch, MatchAssignment, AvailabilityFormData, ShiftRequestWithMatches } from "@/types";
import { ListChecks, Car, ClipboardList, Send, Loader2, AlertTriangle, Users, Edit3, Info, FileText, CheckSquare, CalendarDays, BadgeCheck, Ban } from "lucide-react";
import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const availabilityFormSchema = z.object({
  selectedMatchIds: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos un partido/turno.",
  }),
  hasCar: z.string({ required_error: "Por favor, indica si tienes auto." }),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  selectedClubId: z.string({ required_error: "Debes seleccionar una asociación." }), 
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

interface AvailabilityFormProps {
  initialData: AvailabilityFormData | null;
  user: User;
}

export default function AvailabilityForm({ initialData, user }: AvailabilityFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeClubId, setActiveClubId] = useState(initialData?.activeClubId || '');
  const [showPostulationSummary, setShowPostulationSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const activeClubData = activeClubId ? initialData?.clubs[activeClubId] : undefined;
  
  const canEditCurrentPostulation = activeClubData?.postulation ? isPostulationEditable(
      activeClubData.postulation.selectedMatches, 
      activeClubData.assignments
    ) : true;

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      selectedMatchIds: [],
      hasCar: undefined, 
      notes: "",
      selectedClubId: activeClubId,
    },
  });

  const setupForm = useCallback((clubId: string) => {
    const clubData = initialData?.clubs[clubId];
    if (clubData?.postulation) {
      setIsEditing(true);
      setShowPostulationSummary(true);
      form.reset({
        selectedMatchIds: clubData.postulation.selectedMatches.map(m => m.id),
        hasCar: String(clubData.postulation.hasCar),
        notes: clubData.postulation.notes || "",
        selectedClubId: clubId,
      });
    } else {
      setIsEditing(false);
      setShowPostulationSummary(false);
      form.reset({
        selectedMatchIds: [],
        hasCar: undefined,
        notes: "",
        selectedClubId: clubId,
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (activeClubId) {
      setupForm(activeClubId);
    }
  }, [activeClubId, setupForm]);

  const handleClubChange = (newClubId: string) => {
    setActiveClubId(newClubId);
    form.setValue('selectedClubId', newClubId);
    setupForm(newClubId);
  };

  async function onSubmit(data: AvailabilityFormValues) {
    if (!activeClubData) return;

    startTransition(async () => {
      let result;
      if (isEditing && activeClubData.postulation) {
        result = await updateAvailability(activeClubData.postulation.id, data);
      } else {
        result = await submitAvailability(data);
      }

      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: isEditing ? "Postulación Actualizada" : "Postulación Enviada",
          description: "Tus datos han sido guardados.",
        });
        router.refresh();
      }
    });
  }

  if (!initialData) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
           <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileText className="text-primary" /> Postularse a Partidos/Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">No Perteneces a Ninguna Asociación</p>
          <p>Contacta a un administrador para unirte a una asociación o verifica tu registro.</p>
        </CardContent>
      </Card>
    );
  }

  const { clubs: userClubsMap } = initialData;
  const userClubs = Object.values(userClubsMap).map(c => ({ id: c.id, name: c.name }));
  const clubMatches = activeClubData?.matches || [];
  const assignmentsForUser = activeClubData?.assignments || [];

  if (showPostulationSummary && activeClubData?.postulation) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <CheckSquare className="text-green-500" />
                    Resumen de tu Postulación para: <span className="font-bold text-primary">{activeClubData.name}</span>
                </CardTitle>
                <CardDescription>
                    Esta es tu postulación actual. {canEditCurrentPostulation ? "Puedes editarla si el plazo lo permite." : "Esta postulación ya no es editable."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarDays className="text-primary"/>Partidos Seleccionados:</h3>
                    {activeClubData.postulation.selectedMatches.length > 0 ? (
                        <ul className="space-y-3">
                        {activeClubData.postulation.selectedMatches.map(match => {
                            const isAssignedToThisMatch = assignmentsForUser.some(asg => asg.matchId === match.id);
                            return (
                                <li key={match.id} className="p-3 bg-muted/30 rounded-md border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">{match.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(parseISO(match.date), "EEEE, dd 'de' MMMM 'de' yyyy")} a las {match.time} hs.
                                            </p>
                                            <p className="text-sm text-muted-foreground">Lugar: {match.location}</p>
                                        </div>
                                        {isAssignedToThisMatch && (
                                            <Badge variant="default" className="bg-green-500 text-white whitespace-nowrap mt-1">
                                                <BadgeCheck size={14} className="mr-1" /> Asignado
                                            </Badge>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        </ul>
                    ) : <p className="text-muted-foreground">No has seleccionado partidos en esta postulación.</p>}
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Car className="text-primary"/>Disponibilidad de Auto:</h3>
                    <p className="text-muted-foreground">{activeClubData.postulation.hasCar ? 'Sí' : 'No'}</p>
                </div>
                {activeClubData.postulation.notes && (
                    <div>
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><ClipboardList className="text-primary"/>Notas Adicionales:</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{activeClubData.postulation.notes}</p>
                    </div>
                )}
                
                <div className="border-t pt-4">
                {canEditCurrentPostulation ? (
                    <Button onClick={() => setShowPostulationSummary(false)} className="w-full sm:w-auto">
                        <Edit3 className="mr-2 h-4 w-4" /> Editar Postulación
                    </Button>
                ) : (
                     <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm flex items-start gap-2">
                        <Ban size={20} className="flex-shrink-0 mt-0.5" />
                        <span>La edición no está permitida. Esto puede ser porque la fecha de uno o más partidos está demasiado próxima, o porque ya te han asignado a uno de los partidos de esta postulación.</span>
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {isEditing ? <Edit3 className="text-primary" /> : <FileText className="text-primary" />}
          {isEditing ? "Editar Postulación Enviada" : "Postularse a Partidos/Turnos"}
        </CardTitle>
        <CardDescription>
          {userClubs.length > 1 && "Selecciona una asociación. "}
          {isEditing ? "Modifica los detalles de tu postulación para la asociación:" : "Selecciona los partidos/turnos a los que deseas postularte para la asociación:"}
          <strong className="ml-1">{activeClubData?.name || ''}</strong>.
          {isEditing && <span className="block text-xs text-accent mt-1 italic"><Info size={12} className="inline mr-1"/>Estás editando una postulación previamente enviada.</span>}
          {!canEditCurrentPostulation && isEditing && (
            <span className="block text-xs text-destructive mt-1 italic">
                <Ban size={12} className="inline mr-1"/>Esta postulación ya no es editable.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {userClubs.length > 1 && (
              <FormField
                control={form.control}
                name="selectedClubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2"><Users className="text-primary"/>Seleccionar Asociación</FormLabel>
                    <Select 
                      onValueChange={(value) => {field.onChange(value); handleClubChange(value);}} 
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la asociación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userClubs.map(club => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!activeClubId && userClubs.length > 0 && (
                 <div className="text-center py-6">
                    <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                    <p className="text-lg font-semibold text-muted-foreground mb-1">Selecciona una Asociación</p>
                    <p className="text-xs text-muted-foreground">
                        Por favor, selecciona una asociación de la lista de arriba para continuar.
                    </p>
                 </div>
            )}
            
            {activeClubId && clubMatches.length === 0 && (
              <div className="text-center py-6">
                <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                <p className="text-lg font-semibold text-muted-foreground mb-1">
                   No hay Partidos Definidos para {activeClubData?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  El administrador de la asociación aún no ha definido partidos/turnos.
                </p>
              </div>
            )}

            {activeClubId && clubMatches.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="selectedMatchIds"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base flex items-center gap-2"><ListChecks className="text-primary"/>Partidos/Turnos Disponibles</FormLabel>
                      </div>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {clubMatches.map((match) => (
                          <FormField
                            key={match.id}
                            control={form.control}
                            name="selectedMatchIds"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(match.id);
                              const isThisMatchActuallyEditableByDate = isMatchEditable(match.date);
                              const isThisMatchAssignedToCurrentUser = assignmentsForUser.some(asg => asg.matchId === match.id);
                              
                              const disableCheckbox = !canEditCurrentPostulation || !isThisMatchActuallyEditableByDate || isThisMatchAssignedToCurrentUser;

                              return (
                                <FormItem
                                  key={match.id}
                                  className={cn("flex flex-row items-start space-x-3 space-y-0 p-3 bg-muted/30 rounded-md border", 
                                                (disableCheckbox && !isChecked) && "opacity-70 cursor-not-allowed",
                                                (isThisMatchAssignedToCurrentUser) && "border-green-500"
                                              )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (disableCheckbox && !isChecked) return;
                                        if(isThisMatchAssignedToCurrentUser) return;
                                        
                                        return checked
                                          ? field.onChange([...(field.value || []), match.id])
                                          : field.onChange(
                                              (field.value || []).filter((id) => id !== match.id)
                                            );
                                      }}
                                      disabled={isPending || (disableCheckbox && !isChecked) || isThisMatchAssignedToCurrentUser}
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className={cn("font-normal text-sm", (disableCheckbox && !isChecked) && "text-muted-foreground/70" )}>
                                      {match.description}
                                      {isThisMatchAssignedToCurrentUser && <Badge variant="default" className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5">Asignado a ti</Badge>}
                                    </FormLabel>
                                    <p className={cn("text-xs text-muted-foreground", (disableCheckbox && !isChecked) && "text-muted-foreground/50")}>
                                        {format(parseISO(match.date), "dd/MM/yy")} - {match.time} hs. en {match.location}
                                        {!isThisMatchActuallyEditableByDate && !isThisMatchAssignedToCurrentUser && <span className="text-red-500 text-xs italic ml-1">(Plazo vencido)</span>}
                                    </p>
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasCar"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base flex items-center gap-2"><Car className="text-primary"/>¿Dispones de auto?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value} 
                          className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                          disabled={!canEditCurrentPostulation || isPending}
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="true" />
                            </FormControl>
                            <FormLabel className="font-normal">Sí</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="false" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2"><ClipboardList className="text-primary"/>Aclaraciones Adicionales (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Preferencia horaria específica, limitaciones, etc."
                          className="resize-none"
                          {...field}
                          disabled={!canEditCurrentPostulation || isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                  disabled={isPending || !canEditCurrentPostulation}
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isEditing ? <Edit3 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
                  {isPending ? "Guardando..." : (isEditing ? "Actualizar Postulación" : "Enviar Postulación")}
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    