
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
  getClubDefinedMatches,
  isPostulationEditable, // Import the new helper
} from "@/lib/localStorage";
import type { User, Club, ShiftRequest, ClubSpecificMatch } from "@/types";
import { ListChecks, Car, ClipboardList, Send, Loader2, AlertTriangle, Users, Edit3, Info, FileText, CheckSquare, CalendarDays } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';

const clubSpecificMatchSchema = z.object({
  id: z.string(),
  description: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string(),
});

const availabilityFormSchema = z.object({
  selectedMatches: z.array(clubSpecificMatchSchema).refine((value) => value.length > 0, {
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
  const [clubMatches, setClubMatches] = useState<ClubSpecificMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentActiveClubId, setCurrentActiveClubId] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [currentPostulation, setCurrentPostulation] = useState<ShiftRequest | null>(null);
  const [showPostulationSummary, setShowPostulationSummary] = useState(false);
  const [canEditCurrentPostulation, setCanEditCurrentPostulation] = useState(true);


  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      selectedMatches: [],
      hasCar: undefined, 
      notes: "",
      selectedClubId: "",
    },
  });
  
  const loadClubAndAvailabilityData = useCallback(async (clubId: string | null, userEmail: string | null) => {
    if (!clubId) {
      setClubMatches([]);
      setIsEditing(false);
      setEditingRequestId(null);
      setCurrentPostulation(null);
      setShowPostulationSummary(false);
      setCanEditCurrentPostulation(true);
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId || "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowPostulationSummary(false); // Hide summary when loading new club data or re-evaluating
    const matchesForClub = getClubDefinedMatches(clubId);
    setClubMatches(matchesForClub);
    form.setValue("selectedClubId", clubId);

    if (userEmail) {
      const pendingRequest = findPendingShiftRequestForUserInClub(userEmail, clubId);
      setCurrentPostulation(pendingRequest || null);
      if (pendingRequest) {
        const editable = isPostulationEditable(pendingRequest.selectedMatches);
        setCanEditCurrentPostulation(editable);
        form.reset({
          selectedMatches: pendingRequest.selectedMatches,
          hasCar: pendingRequest.hasCar ? "true" : "false",
          notes: pendingRequest.notes || "",
          selectedClubId: clubId,
        });
        setIsEditing(true);
        setEditingRequestId(pendingRequest.id);
        // Decide if summary or form should be shown initially
        // If editable, show form. If not, show summary (or a specific message).
        // For now, we always go to form if pending, summary is shown after submit.
      } else {
        form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
        setIsEditing(false);
        setEditingRequestId(null);
        setCanEditCurrentPostulation(true); // No postulation, so "can edit" is true for a new one
      }
    } else {
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
      setIsEditing(false);
      setEditingRequestId(null);
      setCurrentPostulation(null);
      setCanEditCurrentPostulation(true);
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
      setCurrentActiveClubId(initialActiveClubId); // Ensure this is set
      if (userDetails.email && initialActiveClubId) {
         loadClubAndAvailabilityData(initialActiveClubId, userDetails.email);
      } else {
        setIsLoading(false); // If no active club or no email somehow
      }
    }
  }, [router, toast, loadClubAndAvailabilityData]);


  const handleClubChange = (newClubId: string) => {
    setActiveClubId(newClubId);
    setCurrentActiveClubId(newClubId);
    setShowPostulationSummary(false); // Hide summary when club changes
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
      selectedMatches: data.selectedMatches,
      hasCar: data.hasCar === "true",
      notes: data.notes || "",
    };

    let successResult: ShiftRequest | null = null;

    if (isEditing && editingRequestId) {
      if (!canEditCurrentPostulation) {
        toast({ title: "Edición no permitida", description: "Esta postulación no puede editarse porque uno o más partidos están demasiado próximos.", variant: "destructive" });
        return;
      }
      successResult = updateShiftRequestDetails(editingRequestId, currentUser.email, requestPayload);
      if (successResult) {
        toast({
          title: "Postulación Actualizada",
          description: `Tu postulación para ${getClubNameById(actualClubId) || 'el club'} ha sido actualizada.`,
        });
      } else {
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar. Puede que el plazo haya vencido.", variant: "destructive" });
      }
    } else {
      successResult = addShiftRequest(requestPayload, currentUser.email, actualClubId);
      if (successResult) {
        toast({
          title: "Postulación Enviada",
          description: `Registrada para ${getClubNameById(actualClubId) || 'el club'}.`,
        });
        // After new submission, update state to reflect this new "pending" request
        setIsEditing(true);
        setEditingRequestId(successResult.id);
        setCanEditCurrentPostulation(isPostulationEditable(successResult.selectedMatches));
      } else {
         toast({ title: "Error al Enviar", description: "No se pudo registrar tu postulación.", variant: "destructive" });
      }
    }
    if (successResult) {
        setCurrentPostulation(successResult); // Update current postulation with new/updated data
        setShowPostulationSummary(true); // Show summary view
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
  
  if (!currentUser) return null;

  if (currentUser.role === 'referee' && (!currentUser.memberClubIds || currentUser.memberClubIds.length === 0)) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
           <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <FileText className="text-primary" /> Postularse a Partidos/Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">No Asociado a Clubes</p>
          <p>Contacta a un administrador para unirte a un club o verifica tu registro.</p>
        </CardContent>
      </Card>
     );
  }
  
  const noClubSelectedOrMatchesConfigured = !currentActiveClubId || clubMatches.length === 0;
  const activeClubName = currentActiveClubId ? getClubNameById(currentActiveClubId) : 'Desconocido';

  if (showPostulationSummary && currentPostulation) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <CheckSquare className="text-green-500" />
                    Postulación {isEditing ? 'Actualizada' : 'Enviada'} para {activeClubName}
                </CardTitle>
                <CardDescription>
                    Este es un resumen de tu postulación.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarDays className="text-primary"/>Partidos Seleccionados:</h3>
                    {currentPostulation.selectedMatches.length > 0 ? (
                        <ul className="space-y-3">
                        {currentPostulation.selectedMatches.map(match => (
                            <li key={match.id} className="p-3 bg-muted/50 rounded-md border">
                                <p className="font-medium">{match.description}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(parseISO(match.date), "EEEE, dd 'de' MMMM 'de' yyyy")} a las {match.time} hs.
                                </p>
                                <p className="text-sm text-muted-foreground">Lugar: {match.location}</p>
                            </li>
                        ))}
                        </ul>
                    ) : <p className="text-muted-foreground">No has seleccionado partidos.</p>}
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Car className="text-primary"/>Disponibilidad de Auto:</h3>
                    <p className="text-muted-foreground">{currentPostulation.hasCar ? 'Sí' : 'No'}</p>
                </div>
                {currentPostulation.notes && (
                    <div>
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><ClipboardList className="text-primary"/>Notas Adicionales:</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{currentPostulation.notes}</p>
                    </div>
                )}
                
                {canEditCurrentPostulation ? (
                    <Button onClick={() => setShowPostulationSummary(false)} className="w-full sm:w-auto">
                        <Edit3 className="mr-2 h-4 w-4" /> Editar Postulación
                    </Button>
                ) : (
                     <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm">
                        <Info size={16} className="inline mr-2" />
                        La edición no está permitida porque uno o más partidos de esta postulación están demasiado próximos o ya han pasado.
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          {isEditing && canEditCurrentPostulation ? <Edit3 className="text-primary" /> : <FileText className="text-primary" />}
          {isEditing && canEditCurrentPostulation ? "Editar Postulación Enviada" : "Postularse a Partidos/Turnos"}
        </CardTitle>
        <CardDescription>
          {currentUser.role === 'referee' && userClubs.length > 1 && "Selecciona un club. "}
          {isEditing && canEditCurrentPostulation ? "Modifica los detalles de tu postulación para el club:" : "Selecciona los partidos/turnos a los que deseas postularte para el club:"}
          <strong className="ml-1">{activeClubName}</strong>.
          {isEditing && canEditCurrentPostulation && <span className="block text-xs text-accent mt-1 italic"><Info size={12} className="inline mr-1"/>Estás editando una postulación previamente enviada.</span>}
          {isEditing && !canEditCurrentPostulation && <span className="block text-xs text-destructive mt-1 italic"><AlertTriangle size={12} className="inline mr-1"/>Esta postulación ya no es editable debido a la proximidad de las fechas de los partidos.</span>}
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
                      disabled={isLoading}
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
                          Selecciona los partidos o bloques de turno a los que te postulas. Las fechas son importantes.
                        </FormDescription>
                      </div>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {clubMatches.map((match) => (
                          <FormField
                            key={match.id}
                            control={form.control}
                            name="selectedMatches"
                            render={({ field }) => {
                              const isChecked = field.value?.some(m => m.id === match.id);
                              const isMatchPastOrTooClose = !isMatchEditable(match.date);
                              const isDisabledForSelection = isEditing && !canEditCurrentPostulation && isChecked && isMatchPastOrTooClose;
                               // If editing an existing uneditable postulation, keep its selections, but disable changes to those specific items.
                               // New items cannot be selected if the overall postulation is uneditable.

                              return (
                                <FormItem
                                  key={match.id}
                                  className={cn("flex flex-row items-start space-x-3 space-y-0 p-3 bg-muted/30 rounded-md border", 
                                                (isEditing && !canEditCurrentPostulation && isChecked) && "opacity-70 cursor-not-allowed",
                                                isMatchPastOrTooClose && !isChecked && "opacity-50"
                                              )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (isEditing && !canEditCurrentPostulation && isChecked) return; // Prevent unchecking if part of uneditable postulation
                                        if (isMatchPastOrTooClose && checked) return; // Prevent selecting a past/too close match if not already selected
                                        
                                        return checked
                                          ? field.onChange([...(field.value || []), match])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value.id !== match.id
                                              )
                                            );
                                      }}
                                      disabled={(isEditing && !canEditCurrentPostulation && isChecked) || (isMatchPastOrTooClose && !isChecked) || (isEditing && !canEditCurrentPostulation)}
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className={cn("font-normal text-sm", (isDisabledForSelection || (isMatchPastOrTooClose && !isChecked)) && "text-muted-foreground")}>
                                      {match.description}
                                    </FormLabel>
                                    <p className={cn("text-xs", (isDisabledForSelection || (isMatchPastOrTooClose && !isChecked)) ? "text-muted-foreground/70" : "text-muted-foreground")}>
                                        {format(parseISO(match.date), "dd/MM/yy")} - {match.time} hs. en {match.location}
                                        {isMatchPastOrTooClose && <span className="text-red-500 text-xs italic ml-1">(Plazo vencido)</span>}
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
                      <FormLabel className="text-base flex items-center gap-2"><Car className="text-primary"/>¿Dispones de auto?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value} 
                          className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                          disabled={isEditing && !canEditCurrentPostulation}
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
                          placeholder="Ej: Preferencia horaria específica, limitaciones, etc."
                          className="resize-none"
                          {...field}
                          disabled={isEditing && !canEditCurrentPostulation}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                  disabled={isLoading || (noClubSelectedOrMatchesConfigured && !!currentActiveClubId) || (isEditing && !canEditCurrentPostulation)}
                >
                  {isEditing && canEditCurrentPostulation ? <Edit3 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {isEditing && canEditCurrentPostulation ? "Actualizar Postulación" : "Enviar Postulación"}
                </Button>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
