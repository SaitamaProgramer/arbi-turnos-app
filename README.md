# ArbiTurnos

Aplicación para la gestión de turnos de árbitros. Construida con Next.js en Firebase Studio.

## ¿Cómo Funciona?

ArbiTurnos conecta a administradores de asociaciones/ligas con árbitros, simplificando el proceso de postulación y asignación de turnos para partidos.

---

## Configuración y Despliegue

Esta sección contiene los pasos técnicos para ejecutar y desplegar la aplicación.

### 1. Variables de Entorno

Tanto para desarrollo local como para producción en Vercel, necesitas configurar las siguientes variables de entorno.

**Crea un archivo `.env` en la raíz de tu proyecto para desarrollo local:**

```env
# Claves de la Base de Datos (Turso)
# Si no las tienes, la app usará una base de datos local (arbitros.db)
TURSO_DATABASE_URL="tu_url_de_turso"
TURSO_AUTH_TOKEN="tu_token_de_turso"

# Claves Secretas de la Aplicación (¡GENÉRALAS TÚ MISMO!)
# Deben ser cadenas de texto largas y aleatorias. No las compartas.
SESSION_SECRET="tu_secreto_de_sesion_largo_y_aleatorio"
PASSWORD_SECRET="tu_secreto_de_contraseña_largo_y_aleatorio"

# Email del Desarrollador
# El administrador que se registre con este email verá la pestaña de "Sugerencias"
DEVELOPER_EMAIL="tu_email_de_desarrollador@ejemplo.com"
```

### 2. Instalación de Dependencias

Ejecuta el siguiente comando en tu terminal:
```bash
npm install
```

### 3. Ejecutar Localmente

```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:9002`.

### 4. Inicializar la Base de Datos (Solo la primera vez)

Ya sea que estés en local o hayas desplegado en Vercel, necesitas crear las tablas en tu base de datos.

- **En Local:** Con la aplicación corriendo, visita la siguiente URL en tu navegador:
  [http://localhost:9002/api/db/init](http://localhost:9002/api/db/init)

- **En Vercel:** Después de desplegar, visita la misma ruta con tu dominio de producción:
  `https://[tu-dominio-de-vercel].app/api/db/init`

Deberías ver un mensaje de éxito. **Solo necesitas hacer esto una vez por cada entorno (local y producción).**

### 5. Despliegue en Vercel

1.  **Sube tu código a GitHub.** Vercel detectará los cambios y comenzará un nuevo despliegue.
2.  **Configura las Variables de Entorno en Vercel:**
    - Ve a tu proyecto en Vercel -> **Settings** -> **Environment Variables**.
    - Añade las 5 variables que definiste en tu archivo `.env` (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`, `PASSWORD_SECRET`, `DEVELOPER_EMAIL`).
    - Vercel podría requerir un redespliegue para aplicar las variables.
3.  **Inicializa la base de datos de producción** como se describe en el paso 4.

---

## Guía de Uso para Árbitros

Como árbitro, tu rol es unirte a una asociación y postularte a los turnos que el administrador haya creado.

### 1. Registrarse en una Asociación
Pídele al administrador el **"Código de Asociación"**.

- En la página de registro, selecciona **"Árbitro"**.
- Ingresa el "Código de Asociación".
- Completa tus datos.

### 2. Postularte a Turnos
Una vez que inicies sesión, irás a la página de **"Disponibilidad"**.

- Si perteneces a varias asociaciones, usa el menú desplegable para seleccionar la correcta.
- Marca los partidos a los que deseas postularte.
- Indica si dispones de auto y añade notas opcionales.
- Haz clic en **"Enviar Postulación"**.

### 3. Consultar y Editar tu Postulación
- Después de enviar, verás un resumen.
- Puedes volver para ver si te han asignado a un partido (verás una insignia verde).
- Puedes hacer clic en **"Editar Postulación"** si el partido no está demasiado cerca o si aún no te lo han asignado.

---

## Guía de Uso para Administradores

Como administrador, tu rol es crear y gestionar tu asociación, definir los turnos y asignar árbitros.

### 1. Registrar tu Asociación
- En la página de registro, selecciona **"Administrador de Asociación"**.
- Ingresa el nombre de tu asociación y completa tus datos.

### 2. Gestionar tu Asociación (Panel de Admin)

#### Pestaña: Info de la Asociación
- Aquí encontrarás el **"Código de la Asociación"**. Compártelo con los árbitros que quieras que se unan.

#### Pestaña: Definir Partidos/Turnos
- Crea los "turnos" a los que los árbitros se postularán (descripción, fecha, hora y lugar).

#### Pestaña: Gestionar Asignaciones
- Vista principal para organizar tus turnos.
- Verás cada partido y la lista de árbitros que se postularon.
- Haz clic en **"Asignar Árbitro"** y selecciona un postulante.

#### Pestaña: Dashboard
- Un resumen rápido del estado de tu asociación: total de árbitros, cuántos han enviado postulaciones y quiénes faltan.

#### Pestaña: Sugerencias (Solo para Desarrollador)
- Si tu email está configurado como `DEVELOPER_EMAIL` en las variables de entorno, verás esta pestaña.
- Aquí puedes leer todas las sugerencias enviadas por los usuarios.
