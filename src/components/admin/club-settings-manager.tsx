
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateClubSettings } from "@/lib/actions";
import type { Club } from "@/types";
import { useTransition } from "react";
import { Save, Loader2, ListTree, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";

const settingsFormSchema = z.object({
  postulationMode: z.enum(["individual", "by_day"], {
    required_error: "Debes seleccionar un modo de postulación.",
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface ClubSettingsManagerProps {
  club: Club;
}

export default function ClubSettingsManager({ club }: ClubSettingsManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      postulationMode: club.postulationMode || 'individual',
    },
  });

  function onSubmit(data: SettingsFormValues) {
    startTransition(async () => {
      const result = await updateClubSettings(club.id, {
        postulationMode: data.postulationMode,
      });

      if (result.success) {
        toast({
          title: "Configuración Guardada",
          description: "El modo de postulación ha sido actualizado.",
          variant: "success",
        });
        router.refresh();
      } else {
        toast({
          title: "Error al Guardar",
          description: result.error || "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modo de Postulación de Árbitros</CardTitle>
        <CardDescription>
          Elige cómo quieres que los árbitros se postulen a los partidos. Este cambio afectará a todos los árbitros de tu asociación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="postulationMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                      disabled={isPending}
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="individual" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold flex items-center gap-2"><ListChecks />Selección Individual</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Los árbitros pueden seleccionar partidos específicos a los que desean postularse.
                          </p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="by_day" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold flex items-center gap-2"><ListTree />Selección por Lote (Día Completo)</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Los árbitros se postulan a todos los partidos de un día completo a la vez (ej. "todo el sábado").
                          </p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isPending ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
