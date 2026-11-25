import type { CaseScore } from "./types";

export const QUESTION_FULL = 100;
export const QUESTION_FLOOR = 10;
export const QUESTION_GRACE_MS = 8000;
export const QUESTION_DROP_PER_SECOND = 4;

const BOARD_KEY = "selectiva-puntajes";
const BOARD_LIMIT = 10;

export interface ScoreRow {
  name: string;
  score: number;
  at: number;
  cases: CaseScore[];
}

export function questionPoints(fits: boolean, elapsedMs: number): number {
  if (!fits) return 0;
  const elapsed = Math.min(120_000, Math.max(0, elapsedMs));
  const lateSeconds = Math.max(0, elapsed - QUESTION_GRACE_MS) / 1000;
  return Math.max(QUESTION_FLOOR, QUESTION_FULL - Math.floor(lateSeconds * QUESTION_DROP_PER_SECOND));
}

export function formatClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function readBoard(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.score === "number" && typeof row.name === "string");
  } catch {
    return [];
  }
}

export function rememberScore(entry: ScoreRow): ScoreRow[] {
  const board = readBoard();
  const previous = board.find((row) => row.name === entry.name);
  if (previous && previous.score >= entry.score) return board;
  const next = board.filter((row) => row.name !== entry.name);
  next.push(entry);
  next.sort((a, b) => b.score - a.score || a.at - b.at);
  const kept = next.slice(0, BOARD_LIMIT);
  localStorage.setItem(BOARD_KEY, JSON.stringify(kept));
  return kept;
}
