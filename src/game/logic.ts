import { assess, CASES, CARDS, ENERGY, STARTER } from "./data";
import { cardPrice, type HeroId } from "./heroes";
import type { CardId, CombatState, FloatText, JournalEntry, Screen } from "./types";

export interface GameState {
  screen: Screen;
  returnTo: Screen;
  hero: HeroId | null;
  deck: CardId[];
  cleared: number;
  caseIndex: number;
  combat: CombatState | null;
  rewardOptions: CardId[];
  seed: number;
}

export type Action =
  | { type: "start" }
  | { type: "choose"; hero: HeroId }
  | { type: "tower" }
  | { type: "lobby" }
  | { type: "codex" }
  | { type: "back" }
  | { type: "open-case"; index: number }
  | { type: "begin" }
  | { type: "admit" }
  | { type: "play"; index: number }
  | { type: "end-turn" }
  | { type: "to-debrief" }
  | { type: "continue" }
  | { type: "pick"; id: CardId }
  | { type: "retry" }
  | { type: "restart" };

const sessionSeed = Math.floor(Math.random() * 1_000_000_000) || 1;

export const initialState: GameState = {
  screen: "title",
  returnTo: "title",
  hero: null,
  deck: [...STARTER],
  cleared: 0,
  caseIndex: 0,
  combat: null,
  rewardOptions: [],
  seed: sessionSeed,
};

function createRng(seed: number) {
  let value = seed >>> 0;
  return {
    next() {
      value = (Math.imul(1664525, value) + 1013904223) >>> 0;
      return value / 4294967296;
    },
    finish() {
      return value >>> 0;
    },
  };
}

function shuffleWith<T>(list: readonly T[], rng: ReturnType<typeof createRng>): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function openingPile(deck: readonly CardId[], ensure: readonly CardId[], rng: ReturnType<typeof createRng>): CardId[] {
  const pile = shuffleWith(deck, rng);
  for (const id of ensure) {
    const index = pile.indexOf(id);
    if (index >= 0) {
      const [card] = pile.splice(index, 1);
      pile.push(card);
    }
  }
  return pile;
}

function drawCards(drawPile: CardId[], discard: CardId[], count: number, rng: ReturnType<typeof createRng>) {
  const draw = [...drawPile];
  let disc = [...discard];
  const drawn: CardId[] = [];
  for (let i = 0; i < count; i += 1) {
    if (draw.length === 0) {
      if (disc.length === 0) break;
      draw.push(...shuffleWith(disc, rng));
      disc = [];
    }
    const card = draw.pop();
    if (!card) break;
    drawn.push(card);
  }
  return { drawPile: draw, discard: disc, drawn };
}

function applyPhase(combat: CombatState): CombatState {
  const phase = CASES[combat.caseIndex].phases.find((item) => item.turn === combat.turn);
  if (!phase || combat.phasesFired.includes(combat.turn)) return combat;
  return {
    ...combat,
    tags: [...new Set([...combat.tags, ...phase.add])],
    attack: combat.attack + (phase.attackPlus ?? 0),
    banner: phase.banner,
    phasesFired: [...combat.phasesFired, combat.turn],
  };
}

function beginCombat(state: GameState, index: number): GameState {
  const hero = state.hero ?? "infectologo";
  const kase = CASES[index];
  const rng = createRng(state.seed);
  const pile = openingPile(state.deck, kase.ensure, rng);
  const dealt = drawCards(pile, [], 4, rng);
  const energyMax = hero === "farmaceutico" ? 2 : ENERGY;
  const patientShift = hero === "bacteriologo" ? -8 : 0;
  const lesson: JournalEntry = {
    title: kase.objectiveTitle,
    body: kase.objective,
    ok: true,
  };
  let combat: CombatState = {
    caseIndex: index,
    hero,
    turn: 1,
    energy: energyMax,
    energyMax,
    discountUsed: false,
    patient: Math.max(8, kase.patient + patientShift),
    patientMax: Math.max(8, kase.patient + patientShift),
    hp: kase.hp,
    hpMax: kase.hp,
    attack: kase.attack + (hero === "infectologo" ? 1 : 0),
    slow: 0,
    tags: [...kase.tags],
    drawPile: dealt.drawPile,
    hand: dealt.drawn,
    discard: dealt.discard,
    playedThisTurn: [],
    lesson,
    journal: [],
    banner: kase.banner,
    floats: [],
    fx: "pared",
    fxKey: 0,
    motion: "idle",
    motionKey: 0,
    patientFxKey: 0,
    won: false,
    lost: false,
    phasesFired: [],
    seq: 1,
  };
  combat = applyPhase(combat);
  return { ...state, screen: "combat", caseIndex: index, combat, seed: rng.finish() };
}

function playCard(state: GameState, index: number): GameState {
  const combat = state.combat;
  if (!combat || combat.won || combat.lost) return state;
  const id = combat.hand[index];
  if (!id) return state;
  const card = CARDS[id];
  const playedThisTurn = [...combat.playedThisTurn, id];
  const kase = CASES[combat.caseIndex];
  const result = assess(id, {
    tags: combat.tags,
    playedThisTurn,
    caseId: kase.id,
  });
  const price = cardPrice(combat.hero, card.cost, result.fits, combat.discountUsed);
  if (price > combat.energy) return state;
  const formulated = combat.hero === "farmaceutico";
  const stained = combat.hero === "bacteriologo" && result.fits;
  const damage = result.damage + (formulated && result.synergy ? 6 : 0) + (stained ? 3 : 0);
  const slowGain = result.slow + (formulated && result.fits && result.slow > 0 ? 2 : 0);

  let tags = combat.tags;
  if (result.addTags.length > 0) tags = [...new Set([...tags, ...result.addTags])];

  const hp = Math.max(0, combat.hp - damage);
  const patient = Math.max(0, combat.patient - result.self);
  const won = hp === 0;
  const lost = !won && patient === 0;
  const lesson: JournalEntry = { title: result.title, body: result.body, ok: result.fits };

  let seq = combat.seq;
  const floats: FloatText[] = [];
  if (!result.fits) floats.push({ id: seq++, text: "resiste", kind: "miss" });
  else if (damage > 0) floats.push({ id: seq++, text: `−${damage}`, kind: "hurt" });
  if (result.synergy) floats.push({ id: seq++, text: "sinergia", kind: "synergy" });
  if (result.fits && slowGain > 0) floats.push({ id: seq++, text: `ataque −${slowGain}`, kind: "synergy" });
  if (result.self > 0) floats.push({ id: seq++, text: `−${result.self}`, kind: "self" });

  return {
    ...state,
    combat: {
      ...combat,
      hand: combat.hand.filter((_, handIndex) => handIndex !== index),
      discard: [...combat.discard, id],
      energy: combat.energy - price,
      discountUsed: combat.discountUsed || price < card.cost,
      playedThisTurn,
      tags,
      hp,
      patient,
      won,
      lost,
      slow: combat.slow + slowGain,
      lesson,
      journal: [...combat.journal, lesson].slice(-6),
      floats,
      fx: result.fits ? card.mechanism : "miss",
      fxKey: combat.fxKey + 1,
      motion: "shake",
      motionKey: combat.motionKey + 1,
      seq,
    },
  };
}

function endTurn(state: GameState): GameState {
  const combat = state.combat;
  if (!combat || combat.won || combat.lost) return state;

  const rawHit = Math.max(0, combat.attack - combat.slow);
  const hit = rawHit;
  const patient = Math.max(0, combat.patient - hit);
  let seq = combat.seq;
  const floats: FloatText[] = [
    hit > 0
      ? { id: seq++, text: `−${hit}`, kind: "patient" }
      : { id: seq++, text: "frenada", kind: "patient" },
  ];

  if (patient === 0) {
    return {
      ...state,
      combat: {
        ...combat,
        patient,
        lost: true,
        floats,
        slow: 0,
        playedThisTurn: [],
        energy: 0,
        patientFxKey: combat.patientFxKey + 1,
        motion: "lunge",
        motionKey: combat.motionKey + 1,
        seq,
        lesson: {
          title: "La infección avanzó",
          body: "La estabilidad llegó a cero. Las cartas en rojo no tenían la diana abierta, o la bacteria ya era resistente.",
          ok: false,
        },
      },
    };
  }

  const rng = createRng(state.seed);
  const discarded = [...combat.discard, ...combat.hand];
  let next: CombatState = {
    ...combat,
    patient,
    slow: 0,
    playedThisTurn: [],
    hand: [],
    discard: discarded,
    turn: combat.turn + 1,
    energy: combat.energyMax,
    discountUsed: false,
    floats,
    patientFxKey: combat.patientFxKey + 1,
    motion: "lunge",
    motionKey: combat.motionKey + 1,
    seq,
  };
  next = applyPhase(next);
  const dealt = drawCards(next.drawPile, next.discard, 4, rng);
  next = { ...next, drawPile: dealt.drawPile, discard: dealt.discard, hand: dealt.drawn };
  return { ...state, combat: next, seed: rng.finish() };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return { ...state, screen: "cast" };
    case "choose":
      return { ...state, hero: action.hero, screen: "reception" };
    case "tower":
      return { ...state, screen: "map" };
    case "lobby":
      if (!state.hero) return state;
      return { ...state, screen: "reception" };
    case "codex":
      if (state.screen === "codex") return state;
      return { ...state, returnTo: state.screen, screen: "codex" };
    case "back":
      return { ...state, screen: state.returnTo };
    case "open-case":
      if (action.index !== state.cleared || action.index >= CASES.length) return state;
      return { ...state, caseIndex: action.index, screen: "brief" };
    case "begin":
      if (state.screen !== "brief") return state;
      return beginCombat(state, state.caseIndex);
    case "admit":
      if (state.screen !== "reception" || state.cleared >= CASES.length) return state;
      return beginCombat(state, state.cleared);
    case "play":
      return playCard(state, action.index);
    case "end-turn":
      return endTurn(state);
    case "to-debrief":
      if (!state.combat?.won) return state;
      return { ...state, screen: "debrief", cleared: state.caseIndex + 1 };
    case "continue": {
      if (!state.combat?.won) return state;
      const reward = CASES[state.caseIndex].reward;
      if (!reward) return { ...state, screen: "ending" };
      return { ...state, screen: "reward", rewardOptions: reward };
    }
    case "pick":
      if (state.screen !== "reward" || !state.rewardOptions.includes(action.id)) return state;
      return { ...state, deck: [...state.deck, action.id], rewardOptions: [], screen: "reception" };
    case "retry":
      if (!state.combat?.lost) return state;
      return beginCombat(state, state.caseIndex);
    case "restart":
      return { ...initialState, deck: [...STARTER], seed: (state.seed + 997) >>> 0 };
    default:
      return state;
  }
}

export function tally(deck: readonly CardId[]): { id: CardId; count: number }[] {
  const counts = new Map<CardId, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count }));
}

export function previewContext(
  tags: readonly string[],
  caseId: string,
  played: readonly CardId[],
  id: CardId,
) {
  return {
    tags,
    caseId,
    playedThisTurn: played.includes(id) ? played : [...played, id],
  };
}
