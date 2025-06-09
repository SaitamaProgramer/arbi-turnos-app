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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFormConfiguration, saveFormConfiguration } from "@/lib/localStorage";
import { DAYS_OF_WEEK, TIME_SLOTS, type FormConfiguration } from "@/types";
import { useEffect, useState } from "react";
import { Save, Settings2, CalendarDays, Clock } from "lucide-react";

const formConfigSchema = z.object({
  configuredDays: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un día.",
  }),
  configuredTimeSlots: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un horario.",
  }),
});

type FormConfigValues = z.infer<typeof formConfigSchema>;

export default function FormConfigEditor() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<FormConfigValues>({
    resolver: zodResolver(formConfigSchema),
    defaultValues: {
      configuredDays: [],
      configuredTimeSlots: [],
    },
  });

  useEffect(() => {
    const currentConfig = getFormConfiguration();
    form.reset({
      configuredDays: currentConfig.availableDays,
      configuredTimeSlots: currentConfig.availableTimeSlots,
    });
    setIsLoading(false);
  }, [form]);

  function onSubmit(data: FormConfigValues) {
    const newConfig: FormConfiguration = {
      availableDays: data.configuredDays,
      availableTimeSlots: data.configuredTimeSlots,
    };
    saveFormConfiguration(newConfig);
    toast({
      title: "Configuración Guardada",
      description: "Los días y horarios disponibles para el formulario han sido actualizados.",
    });
  }

  if (isLoading) {
    return <p>Cargando configuración del formulario...</p>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <Settings2 size={28} className="text-primary" />
          Configurar Formulario de Disponibilidad
        </CardTitle>
        <CardDescription>
          Selecciona los días y horarios que los árbitros podrán elegir al enviar su disponibilidad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="configuredDays"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="text-primary"/>Días Habilitados</FormLabel>
                    <FormDescription>
                      Marca los días de la semana que estarán disponibles en el formulario.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {DAYS_OF_WEEK.map((day) => (
                      <FormField
                        key={`config-day-${day}`}
                        control={form.control}
                        name="configuredDays"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day}
                              className="flex flex-row items-center space-x-3 space-y-0 p-2 bg-muted/30 rounded-md border"
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
                              <FormLabel className="font-normal text-sm">
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
              name="configuredTimeSlots"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-lg font-semibold flex items-center gap-2"><Clock className="text-primary"/>Horarios Habilitados</FormLabel>
                    <FormDescription>
                      Marca los bloques horarios que estarán disponibles en el formulario.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TIME_SLOTS.map((time) => (
                    <FormField
                      key={`config-time-${time}`}
                      control={form.control}
                      name="configuredTimeSlots"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={time}
                            className="flex flex-row items-center space-x-3 space-y-0 p-2 bg-muted/30 rounded-md border"
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
                            <FormLabel className="font-normal text-sm">
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
            <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <Save className="mr-2 h-4 w-4" />
              Guardar Configuración
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
