
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// The SQL statements are now embedded directly in the code to avoid any file system issues on Vercel.
const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'referee')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS clubs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        admin_user_id TEXT NOT NULL,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS user_clubs_membership (
        user_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        PRIMARY KEY (user_id, club_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS club_matches (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        description TEXT NOT NULL,
        match_date TEXT NOT NULL,
        match_time TEXT NOT NULL,
        location TEXT NOT NULL,
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS shift_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        has_car INTEGER NOT NULL,
        notes TEXT,
        status TEXT CHECK(status IN ('pending', 'completed')) NOT NULL DEFAULT 'pending',
        submitted_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS shift_request_matches (
        request_id TEXT NOT NULL,
        match_id TEXT NOT NULL,
        PRIMARY KEY (request_id, match_id),
        FOREIGN KEY (request_id) REFERENCES shift_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS match_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        club_id TEXT NOT NULL,
        match_id TEXT NOT NULL UNIQUE,
        assigned_referee_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (match_id) REFERENCES club_matches(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_referee_id) REFERENCES users(id) ON DELETE CASCADE
    )`
];

export async function GET() {
  try {
    // Execute each statement individually. This is the most robust method for this environment.
    for (const statement of schemaStatements) {
        await db.execute(statement);
    }

    return NextResponse.json({ message: 'Database initialized successfully from embedded schema.' });
  } catch (error) {
    console.error('Database initialization failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Database initialization failed.', error: errorMessage },
      { status: 500 }
    );
  }
}