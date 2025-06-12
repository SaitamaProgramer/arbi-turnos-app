
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
import { useToast } from "@/hooks/use-toast";
import { getClubDefinedMatches, saveClubDefinedMatches } from "@/lib/localStorage";
import type { ClubSpecificMatch } from "@/types";
import { useEffect, useState } from "react";
import { Save, Settings2, ListPlus, Trash2, Loader2, CalendarPlus } from "lucide-react";

const matchSchema = z.object({
  id: z.string(),
  description: z.string().min(5, { message: "La descripción debe tener al menos 5 caracteres." }),
});

const clubMatchesFormSchema = z.object({
  matches: z.array(matchSchema),
});

type ClubMatchesFormValues = z.infer<typeof clubMatchesFormSchema>;

interface ClubMatchManagerProps {
  clubId: string;
}

export default function ClubMatchManager({ clubId }: ClubMatchManagerProps) {
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
        matches: currentMatches.map(m => ({ id: m.id, description: m.description })),
      });
      setIsLoading(false);
    }
  }, [form, clubId]);

  function onSubmit(data: ClubMatchesFormValues) {
    if (!clubId) {
      toast({ title: "Error", description: "No se pudo identificar el club.", variant: "destructive" });
      return;
    }
    // Ensure new matches get a unique ID if they don't have one (though append should handle it)
    const newMatchesToSave: ClubSpecificMatch[] = data.matches.map(m => ({
        id: m.id || crypto.randomUUID(), // Ensure ID exists
        description: m.description,
    }));

    saveClubDefinedMatches(clubId, newMatchesToSave);
    toast({
      title: "Partidos Guardados",
      description: "La lista de partidos/turnos disponibles para tu club ha sido actualizada.",
    });
  }

  const addNewMatchField = () => {
    append({ id: crypto.randomUUID(), description: "" });
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
          <CalendarPlus size={28} className="text-primary" />
          Definir Partidos/Turnos del Club
        </CardTitle>
        <CardDescription>
          Crea, edita o elimina los partidos o bloques de turno específicos a los que los árbitros de tu club podrán postularse.
          Ejemplo: "Sábado 10:00 - Cancha 1: Sub-15", "Domingo Completo - Torneo Adultos".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {fields.length > 0 && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id} // use field.id which is managed by useFieldArray
                    control={form.control}
                    name={`matches.${index}.description`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Descripción del Partido {index + 1}</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              placeholder={`Descripción del Partido/Turno ${index + 1}`} 
                              {...inputField} 
                            />
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}
             {fields.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No hay partidos definidos para este club. Añade el primero.
                </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 items-center">
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
                Los árbitros verán estas descripciones como opciones para seleccionar en el formulario de postulación.
            </FormDescription>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
