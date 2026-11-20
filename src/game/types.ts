import type { HeroId } from "./heroes";

export type Mechanism = "pared" | "proteina" | "acidos" | "membrana" | "metabolica";

export type CardId =
  | "penicilina"
  | "amoxicilina"
  | "ceftriaxona"
  | "meropenem"
  | "vancomicina"
  | "fosfomicina"
  | "gentamicina"
  | "amikacina"
  | "doxiciclina"
  | "claritromicina"
  | "clindamicina"
  | "linezolid"
  | "ciprofloxacino"
  | "rifampicina"
  | "metronidazol"
  | "colistina"
  | "daptomicina"
  | "sulfametoxazol"
  | "trimetoprima"
  | "cotrimoxazol";

export type Shape = "cadena" | "bacilo" | "racimo";
export type Gram = "pos" | "neg";

export interface Ctx {
  tags: readonly string[];
  playedThisTurn: readonly CardId[];
  caseId: string;
}

export interface Assessment {
  fits: boolean;
  title: string;
  body: string;
  damage: number;
  slow: number;
  self: number;
  synergy: boolean;
  addTags: string[];
}

export interface CardDef {
  id: CardId;
  name: string;
  family: string;
  mechanism: Mechanism;
  cost: number;
  effect: string;
  line: string;
  when: string;
  baseDamage: number;
  baseSlow: number;
  selfDamage: number;
  resolve: (ctx: Ctx) => Assessment;
}

export interface Trait {
  id?: string;
  label: string;
  detail: string;
  tone: "ok" | "bad" | "warn";
}

export interface Phase {
  turn: number;
  add: string[];
  attackPlus?: number;
  banner: string;
}

export interface CaseDef {
  id: string;
  bed: string;
  title: string;
  bacteria: string;
  sprite: string;
  photo: string;
  credit: string;
  shape: Shape;
  gram: Gram;
  capsule?: boolean;
  flagella?: boolean;
  hp: number;
  attack: number;
  patient: number;
  tags: string[];
  ensure: CardId[];
  traits: Trait[];
  banner: string;
  objectiveTitle: string;
  objective: string;
  winLine: string;
  lessonTitle: string;
  lessonPoints: string[];
  phases: Phase[];
  reward?: CardId[];
  nextHint: string;
}

export interface JournalEntry {
  title: string;
  body: string;
  ok: boolean;
}

export interface FloatText {
  id: number;
  text: string;
  kind: "hurt" | "miss" | "synergy" | "self" | "patient";
}

export type Screen =
  | "title"
  | "cast"
  | "reception"
  | "codex"
  | "map"
  | "brief"
  | "combat"
  | "debrief"
  | "reward"
  | "ending";

export interface CombatState {
  caseIndex: number;
  hero: HeroId;
  turn: number;
  energy: number;
  energyMax: number;
  discountUsed: boolean;
  patient: number;
  patientMax: number;
  hp: number;
  hpMax: number;
  attack: number;
  slow: number;
  tags: string[];
  drawPile: CardId[];
  hand: CardId[];
  discard: CardId[];
  playedThisTurn: CardId[];
  lesson: JournalEntry;
  journal: JournalEntry[];
  banner: string;
  floats: FloatText[];
  fx: Mechanism | "miss";
  fxKey: number;
  motion: "idle" | "shake" | "lunge";
  motionKey: number;
  patientFxKey: number;
  won: boolean;
  lost: boolean;
  phasesFired: number[];
  seq: number;
}
