
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
  isPostulationEditable,
  isMatchEditable,
  getMatchAssignments,
} from "@/lib/localStorage";
import type { User, Club, ShiftRequest, ClubSpecificMatch, MatchAssignment } from "@/types";
import { ListChecks, Car, ClipboardList, Send, Loader2, AlertTriangle, Users, Edit3, Info, FileText, CheckSquare, CalendarDays, BadgeCheck, Ban } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  const [canEditCurrentPostulation, setCanEditCurrentPostulation] = useState(true);
  
  const [showPostulationSummary, setShowPostulationSummary] = useState(false);
  const [assignmentsForUser, setAssignmentsForUser] = useState<MatchAssignment[]>([]);


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
      setAssignmentsForUser([]);
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId || "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const matchesForClub = getClubDefinedMatches(clubId);
    setClubMatches(matchesForClub);
    form.setValue("selectedClubId", clubId);

    if (userEmail) {
      const pendingRequest = findPendingShiftRequestForUserInClub(userEmail, clubId);
      setCurrentPostulation(pendingRequest || null);

      const allAssignments = getMatchAssignments();
      const userSpecificAssignments = allAssignments.filter(
          asg => asg.clubId === clubId && asg.assignedRefereeEmail === userEmail
      );
      setAssignmentsForUser(userSpecificAssignments);

      if (pendingRequest) {
        const editable = isPostulationEditable(pendingRequest.selectedMatches, userSpecificAssignments);
        setCanEditCurrentPostulation(editable);
        form.reset({
          selectedMatches: pendingRequest.selectedMatches,
          hasCar: pendingRequest.hasCar ? "true" : "false",
          notes: pendingRequest.notes || "",
          selectedClubId: clubId,
        });
        setIsEditing(true);
        setEditingRequestId(pendingRequest.id);
        setShowPostulationSummary(true); 
      } else {
        form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
        setIsEditing(false);
        setEditingRequestId(null);
        setCanEditCurrentPostulation(true); 
        setShowPostulationSummary(false); 
      }
    } else {
      form.reset({ selectedMatches: [], hasCar: undefined, notes: "", selectedClubId: clubId });
      setIsEditing(false);
      setEditingRequestId(null);
      setCurrentPostulation(null);
      setCanEditCurrentPostulation(true);
      setShowPostulationSummary(false);
      setAssignmentsForUser([]);
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
      selectedMatches: data.selectedMatches,
      hasCar: data.hasCar === "true",
      notes: data.notes || "",
    };

    let successResult: ShiftRequest | null = null;

    if (isEditing && editingRequestId) {
       const currentAssignmentsForUser = getMatchAssignments().filter(
            asg => asg.clubId === actualClubId && asg.assignedRefereeEmail === currentUser.email
        );
      if (!isPostulationEditable(data.selectedMatches, currentAssignmentsForUser) && !isPostulationEditable(currentPostulation?.selectedMatches || [], currentAssignmentsForUser) ) {
         // This additional check verifies if the state *before* this specific submit was already uneditable due to assignment or date
         // And if the new data state ALSO remains uneditable for the same reasons.
         // This should allow updating notes/car even if matches are locked.
         // However, the updateShiftRequestDetails needs to be more careful about what it allows.
      } else if (!canEditCurrentPostulation) { // General check based on loaded state
        toast({ title: "Edición no permitida", description: "Esta postulación no puede editarse porque uno o más partidos están demasiado próximos o ya te han sido asignados.", variant: "destructive" });
        return;
      }
      successResult = updateShiftRequestDetails(editingRequestId, currentUser.email, requestPayload, assignmentsForUser);
      if (successResult) {
        toast({
          title: "Postulación Actualizada",
          description: `Tu postulación para ${getClubNameById(actualClubId) || 'el club'} ha sido actualizada.`,
        });
      } else {
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar. Puede que el plazo haya vencido o un partido ya esté asignado.", variant: "destructive" });
      }
    } else {
      successResult = addShiftRequest(requestPayload, currentUser.email, actualClubId);
      if (successResult) {
        toast({
          title: "Postulación Enviada",
          description: `Registrada para ${getClubNameById(actualClubId) || 'el club'}.`,
        });
        setIsEditing(true); 
        setEditingRequestId(successResult.id);
      } else {
         toast({ title: "Error al Enviar", description: "No se pudo registrar tu postulación.", variant: "destructive" });
      }
    }

    if (successResult) {
        setCurrentPostulation(successResult); 
        const freshAssignmentsForUser = getMatchAssignments().filter(asg => asg.clubId === actualClubId && asg.assignedRefereeEmail === currentUser.email);
        setAssignmentsForUser(freshAssignmentsForUser);
        setCanEditCurrentPostulation(isPostulationEditable(successResult.selectedMatches, freshAssignmentsForUser));
        setShowPostulationSummary(true); 
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
    const postulationIsCurrentlyEditable = isPostulationEditable(currentPostulation.selectedMatches, assignmentsForUser);
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                    <CheckSquare className="text-green-500" />
                    Resumen de tu Postulación para: <span className="font-bold text-primary">{activeClubName}</span>
                </CardTitle>
                <CardDescription>
                    Esta es tu postulación actual. {postulationIsCurrentlyEditable ? "Puedes editarla si el plazo lo permite." : "Esta postulación ya no es editable."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CalendarDays className="text-primary"/>Partidos Seleccionados:</h3>
                    {currentPostulation.selectedMatches.length > 0 ? (
                        <ul className="space-y-3">
                        {currentPostulation.selectedMatches.map(match => {
                            const isAssignedToThisMatch = assignmentsForUser.some(asg => asg.matchId === match.id);
                            return (
                                <li key={match.id} className="p-3 bg-muted/30 rounded-md border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">{match.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(parseISO(match.date), "EEEE, dd 'de' MMMM 'de' yyyy")} a las {match.time} hs.
                                            </p>
                                            <p className="text-sm text-muted-foreground">Lugar: {match.location}</p>
                                        </div>
                                        {isAssignedToThisMatch && (
                                            <Badge variant="default" className="bg-green-500 text-white whitespace-nowrap mt-1">
                                                <BadgeCheck size={14} className="mr-1" /> Asignado
                                            </Badge>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        </ul>
                    ) : <p className="text-muted-foreground">No has seleccionado partidos en esta postulación.</p>}
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
                
                <div className="border-t pt-4">
                {postulationIsCurrentlyEditable ? (
                    <Button onClick={() => setShowPostulationSummary(false)} className="w-full sm:w-auto">
                        <Edit3 className="mr-2 h-4 w-4" /> Editar Postulación
                    </Button>
                ) : (
                     <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm flex items-start gap-2">
                        <Ban size={20} className="flex-shrink-0 mt-0.5" />
                        <span>La edición no está permitida. Esto puede ser porque la fecha de uno o más partidos está demasiado próxima, o porque ya te han asignado a uno de los partidos de esta postulación.</span>
                    </div>
                )}
                </div>
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
          {!canEditCurrentPostulation && isEditing && (
            <span className="block text-xs text-destructive mt-1 italic">
                <Ban size={12} className="inline mr-1"/>Esta postulación ya no es editable.
                Puede ser porque la fecha de uno o más partidos está demasiado próxima, o porque ya te han asignado a uno de los partidos de esta postulación.
            </span>
          )}
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
                          Selecciona los partidos o bloques de turno a los que te postulas. Las fechas y asignaciones previas son importantes.
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
                              const isThisSpecificMatchActuallyEditableByDate = isMatchEditable(match.date);
                              
                              // Check if this specific match is assigned to the current user
                              const isThisMatchAssignedToCurrentUser = assignmentsForUser.some(asg => asg.matchId === match.id);
                              
                              // A checkbox is disabled if:
                              // 1. The overall postulation is not editable (due to date or assignment of *any* of its items) AND this match was previously checked.
                              // 2. This specific match is not editable by date AND it wasn't previously checked (can't select a new past/close match).
                              // 3. This specific match IS assigned to the current user (cannot uncheck an assignment here).
                              // 4. The overall postulation is not editable, and this match was NOT previously checked (can't add new items to a locked postulation).
                              const disableCheckbox = 
                                (!canEditCurrentPostulation && isChecked) || 
                                (!isThisSpecificMatchActuallyEditableByDate && !isChecked) || 
                                (isThisMatchAssignedToCurrentUser && isChecked) ||
                                (!canEditCurrentPostulation && !isChecked);
                                                    
                              const labelClass = cn(
                                "font-normal text-sm",
                                disableCheckbox && "text-muted-foreground/70",
                                !isThisSpecificMatchActuallyEditableByDate && !isChecked && "text-red-500/70" 
                              );
                              const descriptionClass = cn(
                                "text-xs",
                                disableCheckbox ? "text-muted-foreground/50" : "text-muted-foreground",
                                !isThisSpecificMatchActuallyEditableByDate && !isChecked && "text-red-500/50"
                              );

                              return (
                                <FormItem
                                  key={match.id}
                                  className={cn("flex flex-row items-start space-x-3 space-y-0 p-3 bg-muted/30 rounded-md border", 
                                                (disableCheckbox) && "opacity-70 cursor-not-allowed",
                                              )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (disableCheckbox) return;
                                        
                                        return checked
                                          ? field.onChange([...(field.value || []), match])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value.id !== match.id
                                              )
                                            );
                                      }}
                                      disabled={disableCheckbox}
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className={labelClass}>
                                      {match.description}
                                      {isThisMatchAssignedToCurrentUser && <Badge variant="default" className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5">Asignado a ti</Badge>}
                                    </FormLabel>
                                    <p className={descriptionClass}>
                                        {format(parseISO(match.date), "dd/MM/yy")} - {match.time} hs. en {match.location}
                                        {!isThisSpecificMatchActuallyEditableByDate && !isThisMatchAssignedToCurrentUser && <span className="text-red-500 text-xs italic ml-1">(Plazo vencido)</span>}
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
                          disabled={!canEditCurrentPostulation && isEditing}
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
                          disabled={!canEditCurrentPostulation && isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                  disabled={isLoading || (noClubSelectedOrMatchesConfigured && !!currentActiveClubId) || (!canEditCurrentPostulation && isEditing)}
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

