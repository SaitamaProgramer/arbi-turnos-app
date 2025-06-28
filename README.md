# ArbiTurnos

Aplicación para la gestión de turnos de árbitros. Construida con Next.js en Firebase Studio.

## ¿Cómo Funciona?

ArbiTurnos conecta a administradores de asociaciones/ligas con árbitros, simplificando el proceso de postulación y asignación de turnos para partidos.

---
## Guía Rápida para Empezar

### 1. Inicializar la Base de Datos (Paso Único)

Ya sea que estés trabajando localmente o hayas desplegado en Vercel, necesitas crear las tablas en tu base de datos por primera vez.

- **Si estás en local:** Ejecuta la aplicación (`npm run dev`) y visita la siguiente URL en tu navegador:
  [http://localhost:9002/api/db/init](http://localhost:9002/api/db/init)

- **Si ya desplegaste en Vercel:** Visita la misma ruta, pero con tu dominio de producción:
  `https://[tu-dominio-de-vercel]/api/db/init`

Deberías ver un mensaje de éxito. **Solo necesitas hacer esto una vez.**

### 2. Registrarse y Usar la App

Una vez que la base de datos está lista, ¡ya puedes usar la aplicación!

- Ve a la página principal y regístrate como **Administrador de Asociación** o como **Árbitro**.
- ¡Explora las funcionalidades!

---

## Guía para Árbitros

Como árbitro, tu rol es unirte a una asociación y postularte a los turnos que el administrador haya creado.

### 1. Registrarse en una Asociación
Para empezar, necesitas una invitación. Pídele al administrador de la asociación el **"Código de Asociación"**.

- En la página de registro, selecciona la opción **"Árbitro"**.
- Ingresa el "Código de Asociación" que te proporcionaron.
- Completa tu nombre, email y crea una contraseña segura.

### 2. Postularte a Turnos
Una vez que inicies sesión, irás a la página de **"Disponibilidad"**.

- Si perteneces a varias asociaciones, usa el menú desplegable para seleccionar la asociación correcta.
- Verás una lista de todos los partidos o turnos disponibles.
- Marca las casillas de todos los partidos para los que deseas postularte.
- Indica si dispones de auto y añade notas opcionales.
- Haz clic en **"Enviar Postulación"**.

### 3. Consultar y Editar tu Postulación
- Después de enviar, verás un resumen de tu postulación.
- Puedes volver a esta página en cualquier momento para ver a qué partidos te has postulado y si ya te han asignado a alguno (aparecerá una insignia verde de **"Asignado"**).
- Puedes hacer clic en **"Editar Postulación"** para cambiar tu disponibilidad. Esto solo es posible si el partido no está demasiado cerca en la fecha o si aún no te lo han asignado.

---

## Guía para Administradores de Asociación

Como administrador, tu rol es crear y gestionar tu asociación, definir los turnos y asignar árbitros.

### 1. Registrar tu Asociación
- En la página de registro, selecciona la opción **"Administrador de Asociación"**.
- Ingresa el nombre que tendrá tu asociación o liga.
- Completa tu nombre, email y crea una contraseña segura. Tu asociación se creará automáticamente.

### 2. Gestionar tu Asociación (Panel de Admin)
Al iniciar sesión, serás redirigido a tu panel de administración. Se divide en varias pestañas:

#### Pestaña: Info de la Asociación
- Aquí encontrarás el **"Código de la Asociación"**. Este código es único.
- Cópialo y compártelo con los árbitros que quieras que se unan a tu asociación. Ellos lo necesitarán para registrarse.

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
- Obtén un resumen rápido del estado de tu asociación: total de árbitros, cuántos han enviado postulaciones y quiénes faltan por hacerlo.

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

3.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

4.  **Inicializar la base de datos local (solo la primera vez):**
    - Con la aplicación corriendo, abre tu navegador y visita:
    [http://localhost:9002/api/db/init](http://localhost:9002/api/db/init)
    - Esto creará todas las tablas necesarias en tu archivo `arbitros.db`.
