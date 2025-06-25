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

---

## Información para Desarrolladores

Esta sección contiene detalles técnicos sobre el proyecto, su estructura y cómo ejecutarlo.

### Tech Stack

- **Framework:** Next.js (App Router)
- **Lenguaje:** TypeScript
- **UI:** React, ShadCN UI, Tailwind CSS
- **Base de Datos:** Turso (libSQL)
- **Autenticación:** JWT con `jose`

### Cómo Ejecutar Localmente

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar variables de entorno:**
    - Crea un archivo `.env` en la raíz y añade las claves `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET` y `PASSWORD_SECRET`. Para desarrollo local, puedes usar `TURSO_DATABASE_URL="file:arbitros.db"`.

3.  **Inicializar la base de datos local (solo la primera vez):**
    - Abre el archivo `schema.sql` y copia su contenido.
    - Puedes usar una extensión de VSCode como "SQLite" o cualquier otro cliente de bases de datos para abrir el archivo `arbitros.db` y pegar/ejecutar el SQL.
    - Alternativamente, si tienes la [CLI de Turso](https://docs.turso.tech/reference/turso-cli#installation), puedes ejecutar:
    ```bash
    turso dev --db-file arbitros.db < schema.sql
    ```

4.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

### Inicializar la Base de Datos de Producción (Método Recomendado)

Para inicializar tu base de datos de producción en Turso por primera vez y crear todas las tablas, el método más sencillo y fiable es usar la interfaz web de Turso.

1. **Inicia Sesión en Turso:**
   - Ve a [https://app.turso.tech/](https://app.turso.tech/) y accede a tu cuenta.

2. **Selecciona tu Base de Datos:**
   - En el dashboard, haz clic sobre el nombre de la base de datos que estás usando para este proyecto.

3. **Abre la Consola (Shell):**
   - Busca y haz clic en la pestaña que dice **"Shell"**. Esto abrirá una consola donde puedes ejecutar comandos SQL directamente.

4. **Copia el Contenido de `schema.sql`:**
   - Abre el archivo `schema.sql` que se encuentra en la raíz de este proyecto.
   - Selecciona y copia **todo** el texto que contiene.

5. **Pega y Ejecuta el Script:**
   - Vuelve a la consola de Turso.
   - Pega el contenido completo que copiaste en el área de texto de la consola.
   - Haz clic en el botón **"Run"** o **"Execute"**.

Después de unos segundos, las tablas se habrán creado en tu base de datos de producción. ¡Y eso es todo! Tu aplicación desplegada en Vercel ahora estará completamente funcional.