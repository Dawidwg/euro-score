import { NextResponse } from 'next/server';
import { getScoreboards } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; juryId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id, juryId } = resolvedParams;

    const scoreboards = await getScoreboards();
    
    // Szukamy po publicToken (jeśli wygenerowany) LUB awaryjnie po starym id
    const scoreboard: any = scoreboards.find(s => 
      (s as any).publicToken === id || s.id === id
    );

    if (!scoreboard) {
      return NextResponse.json({ error: 'Scoreboard not found' }, { status: 404 });
    }

    const validJuries = scoreboard.juries.filter((j: any) => j.votes && Object.keys(j.votes).length > 0);
    const validFullToken = scoreboard.fullToken || 'full';

    // Wersja 1: Pełna prezentacja
    if (juryId === validFullToken) {
      return NextResponse.json({
        ...scoreboard,
        juries: validJuries,
        isFullMode: true,
        totalJuries: validJuries.length // <--- WYSYŁAMY ŁĄCZNĄ LICZBĘ
      });
    }

    // Wersja 2: Odcinkowa
    const targetJuryIndex = validJuries.findIndex((j: any) => j.id === juryId);

    if (targetJuryIndex === -1) {
      return NextResponse.json({ error: 'Jury not found or access denied' }, { status: 403 });
    }

    const safeJuries = validJuries.slice(0, targetJuryIndex + 1);

    return NextResponse.json({
      ...scoreboard,
      juries: safeJuries,
      isFullMode: false,
      totalJuries: validJuries.length // <--- WYSYŁAMY ŁĄCZNĄ LICZBĘ MIMO UCIĘCIA TABLICY
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}