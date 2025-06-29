
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HelpCircle, User, Shield } from "lucide-react";

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
          <HelpCircle size={18} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="text-primary"/> 
            Cómo Usar ArbiTurnos
          </DialogTitle>
          <DialogDescription>
            Guía rápida para administradores de clubes y árbitros.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="referee" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="referee"><User className="mr-2 h-4 w-4"/>Para Árbitros</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="mr-2 h-4 w-4"/>Para Administradores</TabsTrigger>
          </TabsList>
          <TabsContent value="referee" className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-4 text-sm">
                <h3 className="font-semibold text-lg">1. Registro</h3>
                <p>Para empezar, necesitas una invitación de un club. Pídele al administrador del club el <strong>"Código de Club"</strong>.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>En la página de registro, selecciona la opción <strong>"Árbitro"</strong>.</li>
                    <li>Ingresa el "Código de Club" que te proporcionaron.</li>
                    <li>Completa tu nombre, email y crea una contraseña segura.</li>
                </ul>

                <h3 className="font-semibold text-lg">2. Postularte a Turnos</h3>
                <p>Una vez que inicies sesión, irás a la página de "Disponibilidad".</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Si perteneces a varios clubes, usa el menú desplegable para seleccionar el club correcto.</li>
                    <li>Verás una lista de todos los partidos o turnos disponibles definidos por el administrador.</li>
                    <li>Marca las casillas de todos los partidos para los que deseas postularte.</li>
                    <li>Indica si dispones de auto (esto ayuda al administrador con la logística).</li>
                    <li>Puedes añadir notas opcionales si necesitas comunicar algo específico.</li>
                    <li>Haz clic en <strong>"Enviar Postulación"</strong>.</li>
                </ul>

                <h3 className="font-semibold text-lg">3. Consultar y Editar tu Postulación</h3>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>Después de enviar, verás un resumen de tu postulación.</li>
                    <li>Puedes volver a esta página en cualquier momento para ver a qué partidos te has postulado y si ya te han asignado a alguno (aparecerá una insignia verde de "Asignado").</li>
                    <li>Si necesitas cambiar tu disponibilidad, puedes hacer clic en <strong>"Editar Postulación"</strong>. Esto solo es posible si el partido no está demasiado cerca en la fecha o si aún no te lo han asignado.</li>
                </ul>
            </div>
          </TabsContent>
          <TabsContent value="admin" className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
             <div className="space-y-4 text-sm">
                <h3 className="font-semibold text-lg">1. Registro de tu Club</h3>
                <p>Como administrador, tú creas el club desde cero.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>En la página de registro, selecciona la opción <strong>"Administrador de Club"</strong>.</li>
                    <li>Ingresa el nombre que tendrá tu club o liga.</li>
                    <li>Completa tu nombre, email y crea una contraseña segura.</li>
                </ul>

                <h3 className="font-semibold text-lg">2. Gestionar tu Club (Panel de Admin)</h3>
                <p>Al iniciar sesión, serás redirigido a tu panel de administración.</p>
                
                <h4 className="font-medium text-md pl-2">Pestaña: Info del Club</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Aquí encontrarás el <strong>"Código del Club"</strong>. Este código es único y secreto.</li>
                    <li>Cópialo y compártelo con los árbitros que quieras que se unan a tu club. Ellos lo necesitarán para registrarse.</li>
                </ul>
                
                <h4 className="font-medium text-md pl-2">Pestaña: Definir Partidos/Turnos</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Aquí es donde creas los "turnos" a los que los árbitros se postularán.</li>
                    <li>Añade nuevos partidos especificando la descripción (ej: "Final Categoría 2010"), fecha, hora y lugar.</li>
                    <li>Puedes editar y eliminar partidos según sea necesario. Los árbitros verán estos cambios reflejados en su formulario.</li>
                </ul>

                 <h4 className="font-medium text-md pl-2">Pestaña: Gestionar Asignaciones</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Esta es la vista principal para organizar tus turnos.</li>
                    <li>Verás cada partido que definiste.</li>
                    <li>Para cada partido, verás una lista de todos los árbitros que se postularon, junto con sus notas y si tienen auto.</li>
                    <li>Haz clic en <strong>"Asignar Árbitro"</strong> en un partido, selecciona un árbitro de la lista de postulantes y confirma.</li>
                    <li>Una vez asignado, puedes reasignar o quitar la asignación si es necesario.</li>
                </ul>

                <h4 className="font-medium text-md pl-2">Pestaña: Dashboard</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Obtén un resumen rápido del estado de tu club: total de árbitros, cuántos han enviado postulaciones y quiénes faltan por hacerlo.</li>
                </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
