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
import { useToast } from "@/hooks/use-toast";
import { addShiftRequest } from "@/lib/localStorage";
import { DAYS_OF_WEEK, TIME_SLOTS, type ShiftRequest } from "@/types";
import { CalendarDays, Clock, Car, ClipboardList, Send } from "lucide-react";

const availabilityFormSchema = z.object({
  days: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un día.",
  }),
  times: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un horario.",
  }),
  hasCar: z.string({ required_error: "Por favor, indica si tienes auto." }), // Radio group returns string
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function AvailabilityForm() {
  const { toast } = useToast();
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      days: [],
      times: [],
      hasCar: undefined, 
      notes: "",
    },
  });

  function onSubmit(data: AvailabilityFormValues) {
    const requestData: Omit<ShiftRequest, 'id' | 'status' | 'submittedAt' | 'assignedRefereeName'> = {
      days: data.days,
      times: data.times,
      hasCar: data.hasCar === "true",
      notes: data.notes || "",
    };
    addShiftRequest(requestData);
    toast({
      title: "Disponibilidad Enviada",
      description: "Tu disponibilidad ha sido registrada con éxito.",
      variant: "default",
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <ClipboardList className="text-primary" />
          Registrar Disponibilidad
        </CardTitle>
        <CardDescription>
          Completa el formulario para indicar tus días y horarios disponibles, si cuentas con auto y cualquier aclaración adicional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base flex items-center gap-2"><CalendarDays className="text-primary"/>Días Disponibles</FormLabel>
                    <FormDescription>
                      Selecciona los días de la semana en los que puedes arbitrar.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {DAYS_OF_WEEK.map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name="days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), day])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== day
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {day}
                              </FormLabel>
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
              name="times"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base flex items-center gap-2"><Clock className="text-primary"/>Horarios Disponibles</FormLabel>
                    <FormDescription>
                      Selecciona los bloques horarios en los que estás disponible.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TIME_SLOTS.map((time) => (
                    <FormField
                      key={time}
                      control={form.control}
                      name="times"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={time}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(time)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), time])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== time
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {time}
                            </FormLabel>
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
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
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
                      placeholder="Ej: Preferencia por partidos juveniles, disponibilidad limitada en ciertos horarios específicos..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Cualquier información relevante que el administrador deba conocer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <Send className="mr-2 h-4 w-4" />
              Enviar Disponibilidad
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
