
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
  getCurrentUserEmail, 
  findUserByEmail, 
  getActiveClubId, 
  setActiveClubId,
  getClubNameById,
  findClubById,
  findPendingShiftRequestForUserInClub,
  updateShiftRequestDetails,
  getClubDefinedMatches, // New import
} from "@/lib/localStorage";
import type { User, Club, ShiftRequest, ClubSpecificMatch } from "@/types"; // Added ClubSpecificMatch
import { CalendarDays, Clock, Car, ClipboardList, Send, Loader2, AlertTriangle, Users, Edit3, Info, ListChecks } from "lucide-react"; // Replaced CalendarDays, Clock with ListChecks
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// Schema for selected matches
const clubSpecificMatchSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const availabilityFormSchema = z.object({
  selectedMatches: z.array(clubSpecificMatchSchema).refine((value) => value.length > 0, { // Changed from days/times
    message: "Debes seleccionar al menos un partido/turno.",
  }),
  hasCar: z.string({ required_error: "Por favor, indica si tienes auto." }),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  selectedClubId: z.string().optional(), 
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function AvailabilityForm() {
  const { toast } = useToast();
  const router = useRouter();
  // const [formConfig, setFormConfig] = useState<FormConfiguration | null>(null); // Removed FormConfiguration
  const [clubMatches, setClubMatches] = useState<ClubSpecificMatch[]>([]); // New state for club-defined matches
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentActiveClubId, setCurrentActiveClubId] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      selectedMatches: [], // Changed
      hasCar: undefined, 
      notes: "",
      selectedClubId: "",
    },
  });
  
  const loadClubAndAvailabilityData = useCallback(async (clubId: string | null, userEmail: string | null) => {
    if (!clubId) {
      setClubMatches([]); // Clear matches
      setIsEditing(false);
      setEditingRequestId(null);
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId || "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const matchesForClub = getClubDefinedMatches(clubId); // Get specific matches for the club
    setClubMatches(matchesForClub);
    form.setValue("selectedClubId", clubId);

    if (userEmail) {
      const pendingRequest = findPendingShiftRequestForUserInClub(userEmail, clubId);
      if (pendingRequest) {
        form.reset({
          selectedMatches: pendingRequest.selectedMatches, // Populate with selected matches
          hasCar: pendingRequest.hasCar ? "true" : "false",
          notes: pendingRequest.notes || "",
          selectedClubId: clubId,
        });
        setIsEditing(true);
        setEditingRequestId(pendingRequest.id);
      } else {
        form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
        setIsEditing(false);
        setEditingRequestId(null);
      }
    } else {
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
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
      toast({ title: "Acceso no Permitido", description: "Los administradores gestionan, no se postulan.", variant: "destructive" });
      router.push('/admin');
      return;
    }

    if (userDetails.role === 'referee') {
      if (!userDetails.memberClubIds || userDetails.memberClubIds.length === 0) {
        toast({ title: "Sin Clubes", description: "No estás asociado a ningún club.", variant: "destructive"});
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
      selectedMatches: data.selectedMatches, // Changed
      hasCar: data.hasCar === "true",
      notes: data.notes || "",
    };

    if (isEditing && editingRequestId) {
      const updatedRequest = updateShiftRequestDetails(editingRequestId, currentUser.email, requestPayload);
      if (updatedRequest) {
        toast({
          title: "Postulación Actualizada",
          description: `Tu postulación para el club ${getClubNameById(actualClubId) || 'actual'} ha sido actualizada.`,
        });
      } else {
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar la postulación.", variant: "destructive" });
      }
    } else {
      const newShift = addShiftRequest(requestPayload, currentUser.email, actualClubId);
      if (newShift) {
        toast({
          title: "Postulación Enviada",
          description: `Tu postulación ha sido registrada para el club ${getClubNameById(actualClubId) || 'actual'}.`,
        });
        setIsEditing(true);
        setEditingRequestId(newShift.id);
      } else {
         toast({ title: "Error al Enviar", description: "No se pudo registrar tu postulación.", variant: "destructive" });
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
    return (
      <div className="flex justify-center items-center h-64">
        <p>Verificando sesión...</p>
      </div>
    );
  }
  
  if (!currentUser) return null;

  if (currentUser.role === 'referee' && (!currentUser.memberClubIds || currentUser.memberClubIds.length === 0)) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
           <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <ClipboardList className="text-primary" />
            Postularse a Partidos/Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">No Asociado a Clubes</p>
          <p>Contacta a un administrador para unirte a un club.</p>
        </CardContent>
      </Card>
     );
  }
  
  const noClubSelectedOrMatchesConfigured = !currentActiveClubId || clubMatches.length === 0;
  const activeClubName = currentActiveClubId ? getClubNameById(currentActiveClubId) : 'Desconocido';

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {isEditing ? <Edit3 className="text-primary" /> : <ListChecks className="text-primary" />}
          {isEditing ? "Editar Postulación Enviada" : "Postularse a Partidos/Turnos"}
        </CardTitle>
        <CardDescription>
          {currentUser.role === 'referee' && userClubs.length > 1 && "Selecciona un club y luego "}
          {isEditing ? "Modifica los detalles de tu postulación para el club:" : "Selecciona los partidos/turnos a los que deseas postularte para el club:"}
          <strong className="ml-1">{activeClubName}</strong>.
          {isEditing && <span className="block text-xs text-accent mt-1 italic"><Info size={12} className="inline mr-1"/>Estás editando una postulación previamente enviada.</span>}
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
                    <p className="ml-2">Cargando partidos y postulación...</p>
                </div>
            )}

            {!isLoading && noClubSelectedOrMatchesConfigured && currentActiveClubId && (
              <div className="text-center py-6">
                <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                <p className="text-lg font-semibold text-muted-foreground mb-1">
                   No hay Partidos Definidos para {activeClubName}
                </p>
                <p className="text-xs text-muted-foreground">
                  El administrador del club aún no ha definido partidos/turnos para postularse.
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

            {!isLoading && currentActiveClubId && clubMatches.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="selectedMatches"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base flex items-center gap-2"><ListChecks className="text-primary"/>Partidos/Turnos Disponibles</FormLabel>
                        <FormDescription>
                          Selecciona los partidos o bloques de turno a los que te postulas.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {clubMatches.map((match) => (
                          <FormField
                            key={match.id}
                            control={form.control}
                            name="selectedMatches"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={match.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 p-2 bg-muted/30 rounded-md border"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.some(m => m.id === match.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), match])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value.id !== match.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">
                                    {match.description}
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
                          placeholder="Ej: Alguna preferencia horaria específica dentro de un bloque, si tienes alguna limitación, etc."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                  disabled={isLoading || (noClubSelectedOrMatchesConfigured && !!currentActiveClubId)}
                >
                  {isEditing ? <Edit3 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {isEditing ? "Actualizar Postulación" : "Enviar Postulación"}
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
