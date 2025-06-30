import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await db.execute('SELECT 1 + 1 AS result');
    console.log('Conexión a Turso funcionó:', res.rows);
    return NextResponse.json({ message: 'Conexión a Turso OK', result: res.rows });
  } catch (error) {
    console.error('Error al conectar a Turso:', error);
    return NextResponse.json(
      {
        message: 'Error al conectar o autenticar con Turso.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
