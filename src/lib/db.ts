import fs from 'fs/promises';
import path from 'path';
import { Scoreboard } from '../types';

// Ścieżka do naszego pliku bazy w głównym folderze projektu
const dbPath = path.join(process.cwd(), 'database.json');

async function initDb() {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ scoreboards: [] }, null, 2));
  }
}

export async function getScoreboards(): Promise<Scoreboard[]> {
  await initDb();
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data).scoreboards;
}

export async function saveScoreboard(scoreboard: Scoreboard): Promise<void> {
  const scoreboards = await getScoreboards();
  const index = scoreboards.findIndex(s => s.id === scoreboard.id);
  
  if (index >= 0) {
    scoreboards[index] = scoreboard;
  } else {
    scoreboards.push(scoreboard);
  }
  
  await fs.writeFile(dbPath, JSON.stringify({ scoreboards }, null, 2));
}