
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error('The schema.sql file was not found in the project root.');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split schema into individual, trimmed statements and filter out any empty ones
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    // Execute each statement individually, without a transaction wrapper.
    // This is the most robust method for DDL on some distributed systems like Turso
    // when running from a serverless environment.
    for (const statement of statements) {
        await db.execute(statement);
    }

    return NextResponse.json({ message: 'Database initialized successfully statement by statement.' });
  } catch (error) {
    console.error('Database initialization failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Database initialization failed.', error: errorMessage },
      { status: 500 }
    );
  }
}