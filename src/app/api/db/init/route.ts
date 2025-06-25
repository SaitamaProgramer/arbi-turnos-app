
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
    
    // Use db.batch() in 'write' mode, which is the recommended and most robust way 
    // to execute DDL (schema-altering) statements on Turso.
    await db.batch(statements, 'write');

    return NextResponse.json({ message: 'Database initialized successfully using batch execution.' });
  } catch (error) {
    console.error('Database initialization failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Database initialization failed.', error: errorMessage },
      { status: 500 }
    );
  }
}