
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Este array contiene los comandos para borrar las tablas. El orden es inverso a la creación.
const schemaDestructionCommands = [
  'DROP TABLE IF EXISTS match_assignments;',
  'DROP TABLE IF EXISTS shift_request_matches;',
  'DROP TABLE IF EXISTS suggestions;',
  'DROP TABLE IF EXISTS shift_requests;',
  'DROP TABLE IF EXISTS club_matches;',
  'DROP TABLE IF EXISTS user_clubs_membership;',
  'DROP TABLE IF EXISTS clubs;',
  'DROP TABLE IF EXISTS users;',
];

// Este array contiene todos los comandos SQL necesarios para crear el esquema de la base de datos.
// El orden es importante debido a las claves foráneas (foreign keys).
const schemaCreationCommands = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    postulation_mode TEXT NOT NULL DEFAULT 'individual' CHECK(postulation_mode IN ('individual', 'by_day'))
  );`,
  `CREATE TABLE IF NOT EXISTS user_clubs_membership (
    user_id TEXT NOT NULL,
    club_id TEXT NOT NULL,
    role_in_club TEXT NOT NULL CHECK(role_in_club IN ('admin', 'referee')) DEFAULT 'referee',
    PRIMARY KEY (user_id, club_id, role_in_club),
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
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'cancelled', 'postponed')),
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
    match_id TEXT NOT NULL,
    assigned_referee_id TEXT NOT NULL,
    assignment_role TEXT NOT NULL CHECK(assignment_role IN ('referee', 'assistant')) DEFAULT 'referee',
    assigned_at TEXT NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (match_id, assigned_referee_id)
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
    console.log('Reiniciando la base de datos... Enviando comandos de borrado en lote.');
    await db.batch(schemaDestructionCommands, 'write');
    
    console.log('Creando nuevo esquema de base de datos... Enviando comandos de creación en lote.');
    await db.batch(schemaCreationCommands, 'write');

    console.log('La base de datos se ha inicializado correctamente.');
    return NextResponse.json({ message: 'La base de datos se ha reiniciado y actualizado correctamente.' });
  } catch (error) {
    console.error('Error durante la inicialización de la base de datos:', error);
    // Asegurarse de que el error se capture y se devuelva en un formato JSON legible
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: 'La inicialización de la base de datos ha fallado.', error: errorMessage }, { status: 500 });
  }
}
