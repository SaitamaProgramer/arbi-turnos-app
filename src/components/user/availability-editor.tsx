
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isMatchEditable } from "@/lib/utils";
import type { ClubSpecificMatch, MatchAssignment, ShiftRequestWithMatches } from "@/types";
import { ListChecks, Car, ClipboardList, Send, Loader2, AlertTriangle, Edit3, Info, Ban, Clock, BadgeCheck, ListTree } from "lucide-react";
import { useTransition, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { submitAvailability, updateAvailability } from "@/lib/actions";

const availabilityFormSchema = z.object({
  selectedMatchIds: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos un partido/turno.",
  }),
  hasCar: z.string({ required_error: "Por favor, indica si tienes auto." }),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  selectedClubId: z.string({ required_error: "Debes seleccionar una asociación." }),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

interface AvailabilityEditorProps {
  clubId: string;
  clubName: string;
  matches: ClubSpecificMatch[];
  assignments: MatchAssignment[];
  postulation: ShiftRequestWithMatches | null;
  canEdit: boolean;
  postulationMode: 'individual' | 'by_day';
}

export default function AvailabilityEditor({ clubId, clubName, matches, assignments, postulation, canEdit, postulationMode }: AvailabilityEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!postulation;

  const [nonEditableByDateMatchIds, setNonEditableByDateMatchIds] = useState(new Set<string>());

  const matchesForForm = useMemo(() => {
    const today = startOfDay(new Date());
    const postulatedMatchIds = new Set(postulation?.selectedMatches.map(m => m.id) || []);

    const allMatches = matches.filter(match => {
        const isPostulated = postulatedMatchIds.has(match.id);
        const isFutureAndScheduled = !isBefore(parseISO(match.date), today) && match.status === 'scheduled';
        return isPostulated || isFutureAndScheduled;
    });
    
    return allMatches.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [matches, postulation]);
  
  useEffect(() => {
    const nonEditableIds = new Set<string>();
    matchesForForm.forEach(match => {
        if (!isMatchEditable(match.date, match.time)) {
            nonEditableIds.add(match.id);
        }
    });
    setNonEditableByDateMatchIds(nonEditableIds);
  }, [matchesForForm]);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      selectedMatchIds: postulation?.selectedMatches.map(m => m.id) || [],
      hasCar: postulation ? String(postulation.hasCar) : undefined,
      notes: postulation?.notes || "",
      selectedClubId: clubId,
    },
  });

  const { setValue, getValues } = form;

  const groupedMatches = useMemo(() => {
    if (postulationMode !== 'by_day') return {};
    return matchesForForm.reduce((acc: Record<string, ClubSpecificMatch[]>, match) => {
        const dateKey = format(parseISO(match.date), "EEEE, dd 'de' MMMM", { locale: es });
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(match);
        return acc;
    }, {});
  }, [matchesForForm, postulationMode]);


  async function onSubmit(data: AvailabilityFormValues) {
    startTransition(async () => {
      const payload = {
        ...data,
        hasCar: data.hasCar === 'true',
      };

      let result;
      if (isEditing && postulation) {
        result = await updateAvailability(postulation.id, payload);
      } else {
        result = await submitAvailability(payload);
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
          variant: "success",
        });
        router.refresh();
      }
    });
  }

  if (matchesForForm.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
        <p className="text-lg font-semibold text-muted-foreground mb-1">
          No hay Partidos Disponibles para <span className="text-primary font-bold">{clubName}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          El administrador de la asociación no ha definido partidos futuros programados.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm">
        {isEditing ? "Modifica los detalles de tu postulación para la asociación:" : "Selecciona los partidos/turnos a los que deseas postularte para la asociación:"}
        <strong className="ml-1">{clubName}</strong>.
      </p>
      {isEditing && (
        <p className="text-xs text-accent mt-1 italic"><Info size={12} className="inline mr-1" />Estás editando una postulación previamente enviada.</p>
      )}
      {!canEdit && isEditing && (
        <p className="block text-xs text-destructive mt-1 italic">
          <Ban size={12} className="inline mr-1" />Esta postulación ya no es editable.
        </p>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
          <FormField
            control={form.control}
            name="selectedMatchIds"
            render={({ field }) => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base flex items-center gap-2">
                    {postulationMode === 'by_day' ? <ListTree className="text-primary"/> : <ListChecks className="text-primary"/>}
                    {postulationMode === 'by_day' ? 'Días Disponibles' : 'Partidos/Turnos Disponibles'}
                  </FormLabel>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {postulationMode === 'individual' && matchesForForm.map((match) => {
                    const checkboxId = `match-checkbox-${match.id}`;
                    return (
                      <FormField
                        key={match.id}
                        control={form.control}
                        name="selectedMatchIds"
                        render={({ field: individualField }) => {
                          const isChecked = individualField.value?.includes(match.id);
                          const isThisMatchActuallyEditableByDate = !nonEditableByDateMatchIds.has(match.id);
                          const assignment = assignments.find(asg => asg.matchId === match.id);
                          const isThisMatchAssignedToCurrentUser = !!assignment;
                          
                          const canBeSelected = match.status === 'scheduled' && isThisMatchActuallyEditableByDate && !isThisMatchAssignedToCurrentUser;
                          const disableCheckbox = isPending || !canEdit || (!isChecked && !canBeSelected);
                          
                          return (
                            <div
                              key={match.id}
                              className={cn("flex flex-row items-start space-x-3 space-y-0 p-3 bg-muted/30 rounded-md border",
                                (disableCheckbox && !isChecked) && "opacity-70 cursor-not-allowed",
                                isThisMatchAssignedToCurrentUser && "border-green-500",
                                match.status === 'cancelled' && "border-destructive/50",
                                match.status === 'postponed' && "border-yellow-500/50",
                              )}
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (disableCheckbox) return;
                                  return checked
                                    ? individualField.onChange([...(individualField.value || []), match.id])
                                    : individualField.onChange((individualField.value || []).filter((id) => id !== match.id));
                                }}
                                disabled={disableCheckbox}
                              />
                              <div className="flex-1">
                                 <label htmlFor={checkboxId} className={cn("font-normal text-sm flex items-center gap-2 cursor-pointer", (disableCheckbox && !isChecked) && "text-muted-foreground/70 cursor-not-allowed")}>
                                  {match.description}
                                  {isThisMatchAssignedToCurrentUser && <Badge variant="default" className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0.5"><BadgeCheck size={12} className="mr-1"/>Asignado: {assignment.assignmentRole === 'referee' ? 'Árbitro' : 'Asistente'}</Badge>}
                                  {match.status === 'cancelled' && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5"><Ban size={12} className="mr-1"/>Cancelado</Badge>}
                                  {match.status === 'postponed' && <Badge variant="outline" className="text-yellow-600 border-yellow-500 text-[10px] px-1.5 py-0.5"><Clock size={12} className="mr-1"/>Pospuesto</Badge>}
                                </label>
                                <p className={cn("text-xs text-muted-foreground", (disableCheckbox && !isChecked) && "text-muted-foreground/50")}>
                                  {format(parseISO(match.date), "dd/MM/yy", { locale: es })} - {match.time} hs. en {match.location}
                                  {!isThisMatchActuallyEditableByDate && !isThisMatchAssignedToCurrentUser && <span className="text-red-500 text-xs italic ml-1">(Plazo vencido)</span>}
                                </p>
                              </div>
                            </div>
                          );
                        }}
                      />
                    );
                  })}
                  
                  {postulationMode === 'by_day' && Object.entries(groupedMatches).map(([dateKey, matchesInDay]) => {
                      const dayId = `day-checkbox-${dateKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
                      const allMatchIdsInDay = matchesInDay.map(m => m.id);
                      const selectedIdsInForm = getValues("selectedMatchIds") || [];
                      
                      const editableMatchIdsInDay = matchesInDay
                        .filter(match => {
                            const isThisMatchActuallyEditableByDate = !nonEditableByDateMatchIds.has(match.id);
                            const assignment = assignments.find(asg => asg.matchId === match.id);
                            const isThisMatchAssignedToCurrentUser = !!assignment;
                            return match.status === 'scheduled' && isThisMatchActuallyEditableByDate && !isThisMatchAssignedToCurrentUser;
                        }).map(m => m.id);

                      const isDaySelected = editableMatchIdsInDay.length > 0 && editableMatchIdsInDay.every(id => selectedIdsInForm.includes(id));
                      const disableDayCheckbox = isPending || !canEdit || editableMatchIdsInDay.length === 0;

                      return (
                        <div key={dateKey} className={cn("p-3 bg-muted/30 rounded-md border", disableDayCheckbox && "opacity-70")}>
                          <div className="flex flex-row items-center space-x-3 space-y-0">
                            <Checkbox
                              id={dayId}
                              checked={isDaySelected}
                              disabled={disableDayCheckbox}
                              onCheckedChange={(checked) => {
                                const currentSelected = getValues("selectedMatchIds") || [];
                                if (checked) {
                                  const newSelected = [...new Set([...currentSelected, ...editableMatchIdsInDay])];
                                  setValue("selectedMatchIds", newSelected, { shouldValidate: true });
                                } else {
                                  const newSelected = currentSelected.filter(id => !allMatchIdsInDay.includes(id));
                                  setValue("selectedMatchIds", newSelected, { shouldValidate: true });
                                }
                              }}
                            />
                            <label htmlFor={dayId} className={cn("font-semibold text-sm capitalize cursor-pointer", disableDayCheckbox && "cursor-not-allowed")}>{dateKey}</label>
                          </div>
                          <ul className="mt-2 pl-8 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                            {matchesInDay.map(match => (
                              <li key={match.id}>{match.description} ({match.time} hs)
                               { nonEditableByDateMatchIds.has(match.id) && <span className="text-red-500 italic ml-1">(Plazo vencido)</span> }
                               { assignments.some(a=> a.matchId === match.id) && <span className="text-green-600 italic ml-1">(Ya asignado)</span> }
                               { match.status !== 'scheduled' && <span className="text-yellow-600 italic ml-1">({match.status})</span> }
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}

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
                <FormLabel className="text-base flex items-center gap-2"><Car className="text-primary" />¿Dispones de auto?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                    disabled={!canEdit || isPending}
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
                <FormLabel className="text-base flex items-center gap-2"><ClipboardList className="text-primary" />Aclaraciones Adicionales (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ej: Preferencia horaria específica, limitaciones, etc."
                    className="resize-none"
                    {...field}
                    disabled={!canEdit || isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isPending || !canEdit}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Edit3 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />)}
            {isPending ? "Guardando..." : (isEditing ? "Actualizar Postulación" : "Enviar Postulación")}
          </Button>
        </form>
      </Form>
    </>
  );
}
