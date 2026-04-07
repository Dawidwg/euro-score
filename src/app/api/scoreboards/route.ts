import { NextResponse } from 'next/server';
import { getScoreboards, saveScoreboard } from '@/lib/db';

export async function GET() {
  const scoreboards = await getScoreboards();
  return NextResponse.json(scoreboards);
}

export async function POST(request: Request) {
  const body = await request.json();
  await saveScoreboard(body);
  return NextResponse.json({ success: true });
}