
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
  addShiftRequest, 
  getFormConfiguration, 
  getCurrentUserEmail, 
  findUserByEmail, 
  getActiveClubId, 
  setActiveClubId,
  getClubNameById,
  findClubById,
  findPendingShiftRequestForUserInClub,
  updateShiftRequestDetails,
} from "@/lib/localStorage";
import type { FormConfiguration, User, Club, ShiftRequest } from "@/types";
import { CalendarDays, Clock, Car, ClipboardList, Send, Loader2, AlertTriangle, Users, Edit3, Info } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const availabilityFormSchema = z.object({
  days: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un día.",
  }),
  times: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un horario.",
  }),
  hasCar: z.string({ required_error: "Por favor, indica si tienes auto." }),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  selectedClubId: z.string().optional(), 
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function AvailabilityForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentActiveClubId, setCurrentActiveClubId] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      days: [],
      times: [],
      hasCar: undefined, 
      notes: "",
      selectedClubId: "",
    },
  });
  
  const loadClubAndAvailabilityData = useCallback(async (clubId: string | null, userEmail: string | null) => {
    if (!clubId) {
      setFormConfig(null);
      setIsEditing(false);
      setEditingRequestId(null);
      form.reset({ days: [], times: [], hasCar: undefined, notes: "", selectedClubId: clubId || "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const config = getFormConfiguration(clubId);
    setFormConfig(config);
    form.setValue("selectedClubId", clubId); // Ensure selectedClubId in form state is up-to-date

    if (userEmail) {
      const pendingRequest = findPendingShiftRequestForUserInClub(userEmail, clubId);
      if (pendingRequest) {
        form.reset({
          days: pendingRequest.days,
          times: pendingRequest.times,
          hasCar: pendingRequest.hasCar ? "true" : "false",
          notes: pendingRequest.notes || "", // Ensure notes is not undefined
          selectedClubId: clubId,
        });
        setIsEditing(true);
        setEditingRequestId(pendingRequest.id);
      } else {
        form.reset({ days: [], times: [], hasCar: undefined, notes: "", selectedClubId: clubId });
        setIsEditing(false);
        setEditingRequestId(null);
      }
    } else {
      form.reset({ days: [], times: [], hasCar: undefined, notes: "", selectedClubId: clubId });
      setIsEditing(false);
      setEditingRequestId(null);
    }
    setIsLoading(false);
  }, [form]);

  useEffect(() => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      router.push('/login');
      return;
    }
    const userDetails = findUserByEmail(userEmail);
    setCurrentUser(userDetails);

    if (!userDetails) {
      router.push('/login');
      return;
    }
    
    if (userDetails.role === 'admin') {
      toast({ title: "Acceso no Permitido", description: "Los administradores gestionan turnos, no envían disponibilidad.", variant: "destructive" });
      router.push('/admin');
      return;
    }

    if (userDetails.role === 'referee') {
      if (!userDetails.memberClubIds || userDetails.memberClubIds.length === 0) {
        toast({ title: "Sin Clubes", description: "No estás asociado a ningún club. Contacta a un administrador.", variant: "destructive"});
        setIsLoading(false);
        return;
      }
      
      const clubsForUser = userDetails.memberClubIds.map(id => findClubById(id)).filter(Boolean) as Club[];
      setUserClubs(clubsForUser);

      let initialActiveClubId = getActiveClubId();
      if (!initialActiveClubId || !userDetails.memberClubIds.includes(initialActiveClubId)) {
        initialActiveClubId = userDetails.memberClubIds[0]; 
        setActiveClubId(initialActiveClubId);
      }
      setCurrentActiveClubId(initialActiveClubId);
      if (userDetails.email && initialActiveClubId) {
         loadClubAndAvailabilityData(initialActiveClubId, userDetails.email);
      } else {
        setIsLoading(false);
      }
    }
  }, [router, toast, loadClubAndAvailabilityData]);


  const handleClubChange = (newClubId: string) => {
    setActiveClubId(newClubId);
    setCurrentActiveClubId(newClubId);
    if (currentUser?.email) {
      loadClubAndAvailabilityData(newClubId, currentUser.email);
    }
  };

  function onSubmit(data: AvailabilityFormValues) {
    const actualClubId = currentActiveClubId; 
    if (!currentUser || !currentUser.email || !actualClubId) {
      toast({ title: "Error", description: "No se pudo identificar al usuario o su club activo.", variant: "destructive" });
      return;
    }

    const requestPayload = {
      days: data.days,
      times: data.times,
      hasCar: data.hasCar === "true",
      notes: data.notes || "",
    };

    if (isEditing && editingRequestId) {
      const updatedRequest = updateShiftRequestDetails(editingRequestId, currentUser.email, requestPayload);
      if (updatedRequest) {
        toast({
          title: "Disponibilidad Actualizada",
          description: `Tu disponibilidad para el club ${getClubNameById(actualClubId) || 'actual'} ha sido actualizada.`,
        });
        // No need to reset form, it already reflects the edited state. loadClubAndAvailabilityData will be called by club change or initial load.
      } else {
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar la disponibilidad. Puede que ya no esté pendiente o no tengas permiso.", variant: "destructive" });
      }
    } else {
      const newShift = addShiftRequest(
        requestPayload,
        currentUser.email,
        actualClubId
      );
      if (newShift) {
        toast({
          title: "Disponibilidad Enviada",
          description: `Tu disponibilidad ha sido registrada para el club ${getClubNameById(actualClubId) || 'actual'}. Ahora puedes revisarla o editarla si es necesario.`,
        });
        // After successful NEW submission, set component state to reflect editing this new request
        setIsEditing(true);
        setEditingRequestId(newShift.id);
        // Form values are already what was submitted, no need to form.reset if we want them to see what they just submitted.
        // loadClubAndAvailabilityData(actualClubId, currentUser.email); // This will re-fetch and re-set the form, confirming the new state.
      } else {
         toast({ title: "Error al Enviar", description: "No se pudo registrar tu disponibilidad.", variant: "destructive" });
      }
    }
  }
  
  if (!currentUser && isLoading) { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos de usuario...</p>
      </div>
    );
  }

  if (!currentUser && !isLoading) { 
    // This case implies redirection to login should have happened or is about to.
    // findUserByEmail might have returned null after an email was cleared from localStorage.
    return (
      <div className="flex justify-center items-center h-64">
        <p>Verificando sesión...</p>
      </div>
    );
  }
  
  // Ensure currentUser is checked before accessing its properties
  if (!currentUser) return null;


  if (currentUser.role === 'referee' && (!currentUser.memberClubIds || currentUser.memberClubIds.length === 0)) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
           <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <ClipboardList className="text-primary" />
            Registrar Disponibilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">No Asociado a Clubes</p>
          <p className="text-sm text-muted-foreground">
            Actualmente no estás registrado en ningún club. Para enviar tu disponibilidad,
            primero debes unirte a un club usando un código de invitación
            o contactar a un administrador de club.
          </p>
        </CardContent>
      </Card>
     );
  }
  
  const noClubSelectedOrConfigured = !currentActiveClubId || !formConfig || formConfig.availableDays.length === 0 || formConfig.availableTimeSlots.length === 0;
  const activeClubName = currentActiveClubId ? getClubNameById(currentActiveClubId) : 'Desconocido';

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {isEditing ? <Edit3 className="text-primary" /> : <ClipboardList className="text-primary" />}
          {isEditing ? "Editar Disponibilidad Enviada" : "Registrar Disponibilidad"}
        </CardTitle>
        <CardDescription>
          {currentUser.role === 'referee' && userClubs.length > 1 && "Selecciona un club y luego "}
          {isEditing ? "Modifica los detalles de tu disponibilidad para el club:" : "Completa el formulario para indicar tus días y horarios disponibles para el club:"}
          <strong className="ml-1">{activeClubName}</strong>.
          {isEditing && <span className="block text-xs text-accent mt-1 italic"><Info size={12} className="inline mr-1"/>Estás editando una disponibilidad previamente enviada.</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {currentUser.role === 'referee' && userClubs.length > 1 && (
              <FormField
                control={form.control}
                name="selectedClubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2"><Users className="text-primary"/>Seleccionar Club</FormLabel>
                    <Select 
                      onValueChange={(value) => {field.onChange(value); handleClubChange(value);}} 
                      value={field.value || currentActiveClubId || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el club" />
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

            {isLoading && currentActiveClubId && (
                 <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2">Cargando configuración y disponibilidad...</p>
                </div>
            )}

            {!isLoading && noClubSelectedOrConfigured && currentActiveClubId && (
              <div className="text-center py-6">
                <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                <p className="text-lg font-semibold text-muted-foreground mb-1">
                   Formulario No Configurado para {activeClubName}
                </p>
                <p className="text-xs text-muted-foreground">
                  El administrador del club aún no ha configurado los días y horarios.
                </p>
              </div>
            )}
             {!isLoading && !currentActiveClubId && userClubs.length > 0 && (
                 <div className="text-center py-6">
                    <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                    <p className="text-lg font-semibold text-muted-foreground mb-1">Selecciona un Club</p>
                    <p className="text-xs text-muted-foreground">
                        Por favor, selecciona un club de la lista de arriba para continuar.
                    </p>
                 </div>
             )}


            {!isLoading && currentActiveClubId && formConfig && formConfig.availableDays.length > 0 && formConfig.availableTimeSlots.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="days"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base flex items-center gap-2"><CalendarDays className="text-primary"/>Días Disponibles</FormLabel>
                        <FormDescription>
                          Selecciona los días de la semana en los que puedes arbitrar (según configuración de tu club).
                        </FormDescription>
                      </div>
                      {formConfig.availableDays.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {formConfig.availableDays.map((day) => (
                            <FormField
                              key={`day-select-${day}`}
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
                      ) : <p className="text-sm text-muted-foreground">No hay días configurados por el administrador de tu club.</p>}
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
                          Selecciona los bloques horarios en los que estás disponible (según configuración de tu club).
                        </FormDescription>
                      </div>
                      {formConfig.availableTimeSlots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formConfig.availableTimeSlots.map((time) => (
                          <FormField
                            key={`time-select-${time}`}
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
                        ) : <p className="text-sm text-muted-foreground">No hay horarios configurados por el administrador de tu club.</p>}
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
                        Cualquier información relevante que el administrador de tu club deba conocer.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                  disabled={isLoading || noClubSelectedOrConfigured && !!currentActiveClubId}
                >
                  {isEditing ? <Edit3 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {isEditing ? "Actualizar Disponibilidad" : "Enviar Disponibilidad"}
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
