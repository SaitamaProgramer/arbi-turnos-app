
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { getClubDefinedMatches, saveClubDefinedMatches } from "@/lib/localStorage";
import type { ClubSpecificMatch } from "@/types";
import { useEffect, useState } from "react";
import { Save, ListPlus, Trash2, Loader2, CalendarPlusIcon, CalendarIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const matchSchema = z.object({
  id: z.string(),
  description: z.string().min(3, { message: "La descripción debe tener al menos 3 caracteres." }),
  date: z.date({ required_error: "La fecha es requerida." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Formato de hora inválido (HH:MM)." }),
  location: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres." }),
});

const clubMatchesFormSchema = z.object({
  matches: z.array(matchSchema),
});

type ClubMatchesFormValues = z.infer<typeof clubMatchesFormSchema>;

interface ClubMatchManagerProps {
  clubId: string;
  onMatchesUpdated?: () => void;
}

export default function ClubMatchManager({ clubId, onMatchesUpdated }: ClubMatchManagerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<ClubMatchesFormValues>({
    resolver: zodResolver(clubMatchesFormSchema),
    defaultValues: {
      matches: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "matches",
  });

  useEffect(() => {
    if (clubId) {
      setIsLoading(true);
      const currentMatches = getClubDefinedMatches(clubId);
      form.reset({
        matches: currentMatches.map(m => ({ 
          id: m.id, 
          description: m.description,
          date: m.date ? parseISO(m.date) : new Date(), // Parse ISO string to Date object
          time: m.time,
          location: m.location,
        })),
      });
      setIsLoading(false);
    }
  }, [form, clubId]);

  function onSubmit(data: ClubMatchesFormValues) {
    if (!clubId) {
      toast({ title: "Error", description: "No se pudo identificar el club.", variant: "destructive" });
      return;
    }
    const newMatchesToSave: ClubSpecificMatch[] = data.matches.map(m => ({
        id: m.id || crypto.randomUUID(), 
        description: m.description,
        date: format(m.date, 'yyyy-MM-dd'), // Format Date object to ISO string
        time: m.time,
        location: m.location,
    }));

    saveClubDefinedMatches(clubId, newMatchesToSave);
    toast({
      title: "Partidos Guardados",
      description: "La lista de partidos/turnos disponibles para tu club ha sido actualizada.",
    });
    onMatchesUpdated?.();
  }

  const addNewMatchField = () => {
    append({ 
      id: crypto.randomUUID(), 
      description: "", 
      date: new Date(), 
      time: "12:00", 
      location: "" 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando partidos del club...
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <CalendarPlusIcon size={28} className="text-primary" />
          Definir Partidos/Turnos del Club
        </CardTitle>
        <CardDescription>
          Crea, edita o elimina los partidos o bloques de turno específicos para tu club.
          Incluye descripción, fecha, hora y lugar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 space-y-3 bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                    <FormLabel className="text-lg font-semibold">Partido {index + 1}</FormLabel>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Eliminar partido"
                    >
                        <Trash2 size={18} />
                    </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`matches.${index}.description`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><ListPlus className="mr-1 h-4 w-4 text-primary" />Descripción</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Final Liga A vs Liga B" {...inputField} />
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
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !inputField.value && "text-muted-foreground"
                                )}
                                >
                                {inputField.value ? (
                                    format(inputField.value, "PPP") //PPP for more readable date like "Jul 22, 2024"
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
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } // Disable past dates
                                initialFocus
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
                            <Input type="time" placeholder="15:00" {...inputField} />
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
                            <Input placeholder="Ej: Cancha Principal" {...inputField} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </Card>
            ))}
             {fields.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No hay partidos definidos para este club. Añade el primero.
                </p>
            )}

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
                <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios en Partidos
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
