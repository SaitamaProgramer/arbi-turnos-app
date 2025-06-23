
# ArbiTurnos

Aplicación para la gestión de turnos de árbitros. Construida con Next.js en Firebase Studio.

## ¿Cómo Funciona?

ArbiTurnos conecta a administradores de clubes/ligas con árbitros, simplificando el proceso de postulación y asignación de turnos para partidos.

---

## Guía para Árbitros

Como árbitro, tu rol es unirte a un club y postularte a los turnos que el administrador haya creado.

### 1. Registrarse en un Club
Para empezar, necesitas una invitación. Pídele al administrador del club el **"Código de Club"**.

- En la página de registro, selecciona la opción **"Árbitro"**.
- Ingresa el "Código de Club" que te proporcionaron.
- Completa tu nombre, email y crea una contraseña segura.

### 2. Postularte a Turnos
Una vez que inicies sesión, irás a la página de **"Disponibilidad"**.

- Si perteneces a varios clubes, usa el menú desplegable para seleccionar el club correcto.
- Verás una lista de todos los partidos o turnos disponibles.
- Marca las casillas de todos los partidos para los que deseas postularte.
- Indica si dispones de auto y añade notas opcionales.
- Haz clic en **"Enviar Postulación"**.

### 3. Consultar y Editar tu Postulación
- Después de enviar, verás un resumen de tu postulación.
- Puedes volver a esta página en cualquier momento para ver a qué partidos te has postulado y si ya te han asignado a alguno (aparecerá una insignia verde de **"Asignado"**).
- Puedes hacer clic en **"Editar Postulación"** para cambiar tu disponibilidad. Esto solo es posible si el partido no está demasiado cerca en la fecha o si aún no te lo han asignado.

---

## Guía para Administradores de Club

Como administrador, tu rol es crear y gestionar tu club, definir los turnos y asignar árbitros.

### 1. Registrar tu Club
- En la página de registro, selecciona la opción **"Administrador de Club"**.
- Ingresa el nombre que tendrá tu club o liga.
- Completa tu nombre, email y crea una contraseña segura. Tu club se creará automáticamente.

### 2. Gestionar tu Club (Panel de Admin)
Al iniciar sesión, serás redirigido a tu panel de administración. Se divide en varias pestañas:

#### Pestaña: Info del Club
- Aquí encontrarás el **"Código del Club"**. Este código es único.
- Cópialo y compártelo con los árbitros que quieras que se unan a tu club. Ellos lo necesitarán para registrarse.

#### Pestaña: Definir Partidos/Turnos
- Aquí es donde creas los "turnos" a los que los árbitros se postularán.
- Añade nuevos partidos especificando la descripción (ej: "Final Categoría 2010"), fecha, hora y lugar.
- Puedes editar y eliminar partidos según sea necesario.

#### Pestaña: Gestionar Asignaciones
- Esta es la vista principal para organizar tus turnos.
- Verás cada partido y, para cada uno, una lista de todos los árbitros que se postularon.
- Haz clic en **"Asignar Árbitro"**, selecciona un árbitro de la lista de postulantes y confirma.
- Una vez asignado, puedes reasignar o quitar la asignación si es necesario.

#### Pestaña: Dashboard
- Obtén un resumen rápido del estado de tu club: total de árbitros, cuántos han enviado postulaciones y quiénes faltan por hacerlo.
