
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveClubDefinedMatches } from "@/lib/actions";
import type { ClubSpecificMatch } from "@/types";
import { useState, useTransition, useEffect } from "react";
import { Save, ListPlus, Trash2, Loader2, CalendarPlusIcon, CalendarIcon, ClockIcon, MapPinIcon, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, formatISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

const matchSchema = z.object({
  id: z.string(),
  description: z.string().min(3, { message: "La descripción debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es requerida." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Formato de hora inválido (HH:MM)." }),
  location: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres." }),
  status: z.enum(["scheduled", "cancelled", "postponed"]),
});

const clubMatchesFormSchema = z.object({
  matches: z.array(matchSchema),
});

type ClubMatchesFormValues = z.infer<typeof clubMatchesFormSchema>;

interface ClubMatchManagerProps {
  clubId: string;
  initialMatches: ClubSpecificMatch[];
}

export default function ClubMatchManager({ clubId, initialMatches }: ClubMatchManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pastMatchIds, setPastMatchIds] = useState(new Set<string>());
  
  const form = useForm<ClubMatchesFormValues>({
    resolver: zodResolver(clubMatchesFormSchema),
    defaultValues: {
      matches: initialMatches.map(m => ({
        ...m,
        date: parseISO(m.date),
      })).sort((a,b) => b.date.getTime() - a.date.getTime()) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "matches",
  });
  
  useEffect(() => {
    const today = startOfDay(new Date());
    const pastIds = new Set<string>();
    fields.forEach(match => {
        // match.date is already a Date object from the form state
        if (isBefore(match.date, today)) {
            pastIds.add(match.id);
        }
    });
    setPastMatchIds(pastIds);
  }, [fields]);


  function onSubmit(data: ClubMatchesFormValues) {
    startTransition(async () => {
        const newMatchesToSave: Omit<ClubSpecificMatch, 'clubId'>[] = data.matches.map(m => ({
            id: m.id,
            description: m.description,
            date: formatISO(m.date, { representation: 'date' }), // "2024-07-30"
            time: m.time,
            location: m.location,
            status: m.status,
        }));

        const result = await saveClubDefinedMatches(clubId, newMatchesToSave);

        if (result.success) {
            toast({
              title: "Partidos Guardados",
              description: "La lista de partidos/turnos disponibles para tu asociación ha sido actualizada.",
            });
            router.refresh();
        } else {
             toast({
              title: "Error al Guardar",
              description: result.error || "Ocurrió un error inesperado.",
              variant: "destructive"
            });
        }
    });
  }

  const addNewMatchField = () => {
    append({ 
      id: `match_${crypto.randomUUID()}`, 
      description: "", 
      date: new Date(), 
      time: "12:00", 
      location: "",
      status: "scheduled",
    }, { shouldFocus: true });
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <CalendarPlusIcon size={28} className="text-primary" />
          Definir Partidos/Turnos de la Asociación
        </CardTitle>
        <CardDescription>
          Crea, edita o elimina los partidos. Puedes marcar un partido como cancelado o pospuesto. 
          Los partidos pasados no se pueden editar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {fields.map((field, index) => {
                const isPast = pastMatchIds.has(field.id);
                const status = form.watch(`matches.${index}.status`);
                const isCancelled = status === 'cancelled';
                const isEditable = !isPast;
                
                return (
                  <Card key={field.id} className={cn("p-4 space-y-3 bg-muted/30 relative", !isEditable && "opacity-70")}>
                    {!isEditable && <div className="absolute inset-0 bg-transparent z-10" title="Este partido ya pasó y no se puede editar."></div>}
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <FormLabel className="text-lg font-semibold pt-1.5">Partido {index + 1}</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`matches.${index}.status`}
                            render={({ field: inputField }) => (
                              <FormItem>
                                <Select onValueChange={inputField.onChange} defaultValue={inputField.value} disabled={!isEditable}>
                                  <FormControl>
                                    <SelectTrigger className={cn(
                                        "w-[150px] text-xs h-8",
                                        inputField.value === 'scheduled' && "bg-blue-100 border-blue-300 text-blue-800",
                                        inputField.value === 'cancelled' && "bg-red-100 border-red-300 text-red-800",
                                        inputField.value === 'postponed' && "bg-yellow-100 border-yellow-300 text-yellow-800"
                                      )}>
                                      <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="scheduled">Programado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="postponed">Pospuesto</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => remove(index)}
                              aria-label="Eliminar partido"
                              disabled={!isEditable}
                          >
                              <Trash2 size={18} />
                          </Button>
                        </div>
                    </div>
                    <FormField
                      control={form.control}
                      name={`matches.${index}.description`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel className="flex items-center"><ListPlus className="mr-1 h-4 w-4 text-primary" />Descripción</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Final Liga A vs Liga B" {...inputField} disabled={!isEditable || isCancelled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                        control={form.control}
                        name={`matches.${index}.date`}
                        render={({ field: inputField }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center"><CalendarIcon className="mr-1 h-4 w-4 text-primary" />Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    disabled={!isEditable || isCancelled}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !inputField.value && "text-muted-foreground"
                                    )}
                                    >
                                    {inputField.value ? (
                                        format(inputField.value, "PPP", { locale: es })
                                    ) : (
                                        <span>Selecciona una fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={inputField.value}
                                    onSelect={inputField.onChange}
                                    initialFocus
                                    locale={es}
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name={`matches.${index}.time`}
                        render={({ field: inputField }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><ClockIcon className="mr-1 h-4 w-4 text-primary" />Hora (HH:MM)</FormLabel>
                            <FormControl>
                                <Input type="time" placeholder="15:00" {...inputField} disabled={!isEditable || isCancelled} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name={`matches.${index}.location`}
                        render={({ field: inputField }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><MapPinIcon className="mr-1 h-4 w-4 text-primary" />Lugar</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Cancha Principal" {...inputField} disabled={!isEditable || isCancelled} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                     {status === 'postponed' && (
                        <div className="text-xs text-muted-foreground p-2 bg-yellow-100/50 border-l-4 border-yellow-400 flex items-center gap-2 rounded">
                          <InfoIcon size={14} className="text-yellow-600"/>
                          <p>Has marcado este partido como <strong>pospuesto</strong>. Asegúrate de actualizar la fecha y hora a su nuevo valor.</p>
                        </div>
                      )}
                  </Card>
                )
            })}
             {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No hay partidos definidos para esta asociación. Añade el primero.
                </p>
            )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addNewMatchField}
                  className="w-full sm:w-auto"
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Añadir Nuevo Partido/Turno
                </Button>
                <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isPending ? 'Guardando...' : 'Guardar Cambios en Partidos'}
                </Button>
            </div>
            <FormDescription>
                Los árbitros verán estos partidos como opciones para seleccionar en el formulario de postulación.
            </FormDescription>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
