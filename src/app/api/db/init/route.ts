
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Este array contiene todos los comandos SQL necesarios para crear el esquema de la base de datos.
// El orden es importante debido a las claves foráneas (foreign keys).
const schemaCreationCommands = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'referee'))
  );`,
  `CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS user_clubs_membership (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    PRIMARY KEY (user_id, club_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS club_matches (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    description TEXT NOT NULL,
    match_date TEXT NOT NULL,
    match_time TEXT NOT NULL,
    location TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS shift_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    has_car INTEGER NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
    submitted_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS shift_request_matches (
    request_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    PRIMARY KEY (request_id, match_id),
    FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS match_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    match_id TEXT NOT NULL UNIQUE,
    assigned_referee_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
   `CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      suggestion_text TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );`
];


export async function GET() {
  try {
    console.log('Iniciando la inicialización de la base de datos...');
    
    // Ejecutar cada comando de creación de tabla de forma secuencial.
    for (const command of schemaCreationCommands) {
      await db.execute(command);
    }

    console.log('La base de datos se ha inicializado correctamente.');
    return NextResponse.json({ message: 'La base de datos se ha inicializado correctamente.' });
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
    // Asegurarse de que el error se capture y se devuelva en un formato JSON legible
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: 'La inicialización de la base de datos ha fallado.', error: errorMessage }, { status: 500 });
  }
}
