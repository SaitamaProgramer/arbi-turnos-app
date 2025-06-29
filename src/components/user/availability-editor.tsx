
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
import { ListChecks, Car, ClipboardList, Send, Loader2, AlertTriangle, Edit3, Info, Ban } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
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
  assignments: Omit<MatchAssignment, 'id' | 'clubId' | 'assignedAt'>[];
  postulation: ShiftRequestWithMatches | null;
  canEdit: boolean;
}

export default function AvailabilityEditor({ clubId, clubName, matches, assignments, postulation, canEdit }: AvailabilityEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!postulation;

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      selectedMatchIds: postulation?.selectedMatches.map(m => m.id) || [],
      hasCar: postulation ? String(postulation.hasCar) : undefined,
      notes: postulation?.notes || "",
      selectedClubId: clubId,
    },
  });

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

  if (matches.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
        <p className="text-lg font-semibold text-muted-foreground mb-1">
          No hay Partidos Definidos para {clubName}
        </p>
        <p className="text-xs text-muted-foreground">
          El administrador de la asociación aún no ha definido partidos/turnos.
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
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base flex items-center gap-2"><ListChecks className="text-primary" />Partidos/Turnos Disponibles</FormLabel>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {matches.map((match) => (
                    <FormField
                      key={match.id}
                      control={form.control}
                      name="selectedMatchIds"
                      render={({ field }) => {
                        const isChecked = field.value?.includes(match.id);
                        const isThisMatchActuallyEditableByDate = isMatchEditable(match.date);
                        const isThisMatchAssignedToCurrentUser = assignments.some(asg => asg.matchId === match.id);
                        const disableCheckbox = !canEdit || !isThisMatchActuallyEditableByDate || isThisMatchAssignedToCurrentUser;

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
                                  if (isThisMatchAssignedToCurrentUser) return;
                                  return checked
                                    ? field.onChange([...(field.value || []), match.id])
                                    : field.onChange((field.value || []).filter((id) => id !== match.id));
                                }}
                                disabled={isPending || (disableCheckbox && !isChecked) || isThisMatchAssignedToCurrentUser}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <FormLabel className={cn("font-normal text-sm", (disableCheckbox && !isChecked) && "text-muted-foreground/70")}>
                                {match.description}
                                {isThisMatchAssignedToCurrentUser && <Badge variant="default" className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5">Asignado a ti</Badge>}
                              </FormLabel>
                              <p className={cn("text-xs text-muted-foreground", (disableCheckbox && !isChecked) && "text-muted-foreground/50")}>
                                {format(parseISO(match.date), "dd/MM/yy", { locale: es })} - {match.time} hs. en {match.location}
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

    