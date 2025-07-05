'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, User, Shield } from "lucide-react";

interface OnboardingHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab: 'admin' | 'referee';
}

export function OnboardingHelpDialog({ isOpen, onClose, defaultTab }: OnboardingHelpDialogProps) {

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="text-primary"/> 
            ¡Bienvenido a ArbiTurnos!
          </DialogTitle>
          <DialogDescription>
            Aquí tienes una guía rápida para empezar. Puedes volver a verla desde el botón "Ayuda" en el menú.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="referee"><User className="mr-2 h-4 w-4"/>Para Árbitros</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="mr-2 h-4 w-4"/>Para Administradores</TabsTrigger>
          </TabsList>
          <TabsContent value="referee" className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-4 text-sm">
                <h3 className="font-semibold text-lg">1. Registro y Login</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Registro:</strong> Para empezar, necesitas una invitación. Pídele al administrador de la asociación el <strong>"Código de Asociación"</strong>. En la página de registro, selecciona "Árbitro", ingresa el código y completa tus datos.</li>
                    <li><strong>Login:</strong> Una vez registrado, puedes acceder con tu email y contraseña desde la página de "Iniciar Sesión".</li>
                </ul>

                <h3 className="font-semibold text-lg">2. Postularte a Turnos</h3>
                <p>La página principal es "Disponibilidad". Desde aquí gestionas todo.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Seleccionar Asociación:</strong> Si perteneces a varias asociaciones, usa el menú desplegable para elegir la correcta. La página mostrará los partidos de esa asociación.</li>
                    <li><strong>Modos de Postulación:</strong> El administrador decide cómo te postulas. Puede ser <strong>"Individual"</strong> (marcas cada partido que te interese) o por <strong>"Lote"</strong> (marcas un día completo, ej. "todo el sábado", para postularte a todos sus partidos a la vez).</li>
                    <li>Indica si dispones de auto y añade notas si es necesario.</li>
                    <li>Haz clic en <strong>"Enviar Postulación"</strong> para guardar.</li>
                </ul>

                <h3 className="font-semibold text-lg">3. Consultar y Editar tu Postulación</h3>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>Después de enviar, verás un <strong>Resumen</strong> de tu postulación.</li>
                    <li>En el resumen, podrás ver a qué partidos te han asignado con una insignia verde de <strong>"Asignado"</strong>.</li>
                    <li>También verás si un partido fue <strong>"Cancelado"</strong> o <strong>"Pospuesto"</strong> por el administrador.</li>
                    <li>Puedes hacer clic en <strong>"Editar Postulación"</strong>, pero solo si cumples dos condiciones: que falten <strong>más de 12 horas</strong> para el inicio del partido y que <strong>aún no te lo hayan asignado</strong>. Si no cumples alguna de estas, el botón estará desactivado.</li>
                </ul>

                <h3 className="font-semibold text-lg">4. Unirte a más Asociaciones</h3>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>En la parte inferior de la página de "Disponibilidad", encontrarás un formulario.</li>
                    <li>Pídele el nuevo <strong>"Código de Asociación"</strong> al administrador de la otra liga, ingrésalo y haz clic en "Unirse". ¡Listo! La nueva asociación aparecerá en tu menú desplegable.</li>
                </ul>
                
                <h3 className="font-semibold text-lg">5. Gestionar tu Cuenta</h3>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>En la sección <strong>"Mi Cuenta"</strong>, puedes cambiar tu contraseña.</li>
                    <li>También encontrarás tus <strong>estadísticas personales</strong>, incluyendo un historial detallado de los partidos que has dirigido y los que fueron cancelados.</li>
                </ul>
            </div>
          </TabsContent>
          <TabsContent value="admin" className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
             <div className="space-y-4 text-sm">
                <h3 className="font-semibold text-lg">1. Registro y Login</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Registro:</strong> En la página de registro, selecciona "Administrador de Asociación", elige un nombre para tu liga y completa tus datos.</li>
                    <li><strong>Login:</strong> Accede con tu email y contraseña. Serás redirigido a tu panel de administración.</li>
                </ul>

                <h3 className="font-semibold text-lg">2. Panel de Administración</h3>
                <p>Tu panel se organiza en pestañas para facilitar la gestión.</p>
                
                <h4 className="font-medium text-md pl-2">Pestaña: Dashboard</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Un resumen rápido: total de árbitros, cuántos han enviado postulaciones y quiénes faltan por hacerlo.</li>
                </ul>
                
                <h4 className="font-medium text-md pl-2">Pestaña: Asignaciones</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>La vista principal para organizar tus turnos. Verás cada partido con la lista de árbitros que se postularon.</li>
                    <li>Asigna <strong>árbitros</strong> y <strong>asistentes</strong> haciendo clic en los botones de gestión correspondientes.</li>
                    <li>Usa el botón <strong>"Publicar / Compartir"</strong> para generar una vista limpia de las asignaciones, ideal para descargar como imagen PNG o guardar como PDF.</li>
                </ul>

                 <h4 className="font-medium text-md pl-2">Pestaña: Definir Partidos</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Aquí creas y gestionas los turnos. Añade partidos con su descripción, fecha, hora y lugar.</li>
                    <li>Usa el menú desplegable en cada partido para marcarlo como <strong>Cancelado</strong> o <strong>Pospuesto</strong>.</li>
                    <li>Para agilizar la carga, usa el botón <strong>"Reutilizar"</strong> en cualquier partido para crear una copia que solo necesita una nueva fecha y hora.</li>
                     <li><strong>Importante:</strong> Siempre haz clic en <strong>"Guardar Cambios en Partidos"</strong> para que tus modificaciones se apliquen.</li>
                </ul>

                <h4 className="font-medium text-md pl-2">Pestaña: Miembros</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Promover a Admin:</strong> Dale permisos de administrador a un árbitro de confianza.</li>
                    <li><strong>Revocar Admin:</strong> Convierte a un administrador de vuelta en árbitro. (No puedes hacerlo si es el último admin).</li>
                    <li><strong>Eliminar Miembro:</strong> Quita a un usuario de tu asociación. Esta acción es irreversible y borrará sus datos relacionados (postulaciones, asignaciones).</li>
                </ul>

                 <h4 className="font-medium text-md pl-2">Pestaña: Configuración</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Aquí encontrarás el <strong>"Código de la Asociación"</strong> para compartir con nuevos árbitros.</li>
                    <li>Puedes cambiar el <strong>Modo de Postulación</strong> entre "Individual" (un partido a la vez) y "Por Lote" (días completos).</li>
                </ul>
                 <h4 className="font-medium text-md pl-2">Pestaña: Sugerencias</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Si tu email coincide con el del desarrollador en la configuración, verás esta pestaña para leer las sugerencias de todos los usuarios.</li>
                </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
