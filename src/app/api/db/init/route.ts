import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error('schema.sql file not found in the project root.');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // For @libsql/client, we need to split statements and run them in a batch.
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    await db.batch(statements);

    return NextResponse.json({ message: 'Database initialized successfully based on schema.sql.' });
  } catch (error) {
    console.error('Database initialization failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Database initialization failed.', error: errorMessage },
      { status: 500 }
    );
  }
}
