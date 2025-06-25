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

La aplicación está construida con un stack moderno, enfocado en rendimiento y experiencia de desarrollo:

- **Framework:** [Next.js](https://nextjs.org/) (usando el App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **UI Framework:** [React](https://reactjs.org/)
- **Componentes UI:** [ShadCN UI](https://ui.shadcn.com/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos:** [Turso](https://turso.tech/) (con [libSQL](https://libsql.org/)) para producción, con fallback a un archivo SQLite local para desarrollo.
- **ORM/Cliente DB:** `@libsql/client`
- **Autenticación:** Sesiones JWT manejadas con `jose` y cookies `httpOnly`.
- **Validaciones:** [Zod](https://zod.dev/) para la validación de esquemas y formularios.
- **Despliegue:** Preparado para [Vercel](https://vercel.com/).

### Estructura del Proyecto

El código fuente se encuentra en el directorio `src/`.

- `src/app/`: Contiene las rutas de la aplicación (App Router de Next.js). Cada carpeta es un segmento de la URL.
  - `(pages)`: Grupos de rutas para las páginas principales como login, registro, admin, etc.
  - `api/`: Contiene los endpoints de la API, como el script para inicializar la base de datos.
  - `layout.tsx`: El layout principal de la aplicación.
  - `globals.css`: Estilos globales y configuración de temas de ShadCN/Tailwind.
- `src/components/`: Componentes reutilizables de React.
  - `ui/`: Componentes base de ShadCN UI.
  - `admin/`: Componentes específicos del panel de administración.
  - `user/`: Componentes específicos de la vista de árbitro.
  - `layout/`: Componentes de la estructura de la página (Navbar, etc.).
- `src/lib/`: Lógica principal del backend y utilidades.
  - `actions.ts`: Server Actions de Next.js para interactuar con la base de datos (crear usuarios, guardar turnos, etc.).
  - `db.ts`: Configuración del cliente de la base de datos (Turso/libSQL).
  - `session.ts`: Lógica para la gestión de sesiones de usuario (crear, verificar y eliminar sesión).
  - `utils.ts`: Funciones de utilidad reutilizables.
- `src/types/`: Definiciones de tipos de TypeScript para los modelos de datos (User, Club, etc.).
- `src/hooks/`: Hooks personalizados de React.
- `schema.sql`: El esquema SQL que define la estructura de la base de datos.
- `.env`: Archivo de variables de entorno para desarrollo local (no incluido en Git).

### Cómo Ejecutar Localmente

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - Renombra el archivo `.env.example` a `.env` (si existe) o crea un nuevo archivo `.env` en la raíz del proyecto.
   - Añade las siguientes claves. Puedes usar los valores de ejemplo que ya están en el archivo o generar los tuyos propios:
     ```
     # Claves para la encriptación de sesión y contraseñas. ¡Deben ser secretas!
     SESSION_SECRET="tu_secreto_para_sesiones_aqui_largo_y_seguro"
     PASSWORD_SECRET="tu_secreto_para_passwords_aqui_largo_y_seguro"

     # No son necesarias para el desarrollo local, la app usará un archivo .db
     TURSO_DATABASE_URL="file:arbitros.db"
     TURSO_AUTH_TOKEN=""
     ```

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Inicializar la base de datos local (solo la primera vez):**
   - Una vez que la aplicación esté corriendo, abre tu navegador y visita: `http://localhost:9002/api/db/init`
   - Esto creará el archivo `arbitros.db` con todas las tablas necesarias.

¡Ahora la aplicación debería estar funcionando en `http://localhost:9002`!
