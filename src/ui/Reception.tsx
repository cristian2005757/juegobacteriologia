import { useEffect, useState } from "react";
import { CASES } from "../game/data";
import { FLOORS, heroById } from "../game/heroes";
import type { HeroId } from "../game/heroes";
import { audio } from "../game/audio";
import type { Action, GameState } from "../game/logic";

const MAP = [
  "################",
  "#SS..H..H.#..D.#",
  "#..a......+....#",
  "#H..H.....#....#",
  "#..........#B..#",
  "#WW.......#....#",
  "#..............#",
  "################",
];

const ROWS = MAP.length;
const COLS = MAP[0].length;
const SOLID = new Set(["#", "S", "T", "D", "W", "B", "C", "H", "M"]);

const PROP: Record<string, string> = {
  S: "/overworld/prop-sofa.png",
  T: "/overworld/prop-table.png",
  D: "/overworld/prop-desk.png",
  W: "/overworld/prop-plant.png",
  B: "/overworld/prop-bed.png",
  C: "/overworld/prop-cabinet.png",
  H: "/overworld/prop-chair.png",
  M: "/overworld/prop-monitor.png",
};

const SPRITE: Record<string, { front: string; back: string }> = {
  infectologo: { front: "/overworld/infectologo-front.png", back: "/overworld/infectologo-back.png" },
  farmaceutico: { front: "/overworld/farmaceutico-front.png", back: "/overworld/farmaceutico-back.png" },
  bacteriologo: { front: "/overworld/bacteriologo-front.png", back: "/overworld/bacteriologo-back.png" },
  nurse: { front: "/overworld/nurse-front.png", back: "/overworld/nurse-back.png" },
  patient: { front: "/overworld/patient-front.png", back: "/overworld/patient-back.png" },
  orderly: { front: "/overworld/orderly-front.png", back: "/overworld/orderly-back.png" },
};

type Dir = "up" | "down" | "left" | "right";
type Speaker = "nurse" | "patient" | "orderly";
type Spot = { col: number; row: number; face: Dir };
type Phase = "seek" | "retire" | "escort" | "ready";

const ORDERLY: Spot = { col: 3, row: 2, face: "down" };
const SEATS = [
  { col: 13, row: 3 },
  { col: 14, row: 3 },
  { col: 13, row: 4 },
  { col: 11, row: 4 },
];
const PARKS = [
  { col: 11, row: 1 },
  { col: 12, row: 1 },
  { col: 11, row: 3 },
];

const NAMES: Record<Speaker, string> = {
  nurse: "Enfermera",
  patient: "Paciente",
  orderly: "Camillero",
};

const PORTRAIT: Record<Speaker, string> = {
  nurse: "/allies/nurse.png",
  patient: "/allies/patient.png",
  orderly: "/overworld/orderly-front.png",
};

function tileAt(col: number, row: number) {
  if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return "#";
  const mark = MAP[row][col];
  if (mark === "a") return ".";
  return mark;
}

function walkable(col: number, row: number, blocked: Set<string>) {
  if (SOLID.has(tileAt(col, row))) return false;
  return !blocked.has(`${col},${row}`);
}

function faceToward(from: { col: number; row: number }, to: { col: number; row: number }): Dir {
  if (to.col < from.col) return "left";
  if (to.col > from.col) return "right";
  if (to.row < from.row) return "up";
  return "down";
}

function nextStep(from: Spot, goal: { col: number; row: number }, blocked: Set<string>): Spot | null {
  if (from.col === goal.col && from.row === goal.row) return null;
  const key = (col: number, row: number) => `${col},${row}`;
  const queue: Array<[number, number]> = [[from.col, from.row]];
  const prev = new Map<string, string>();
  prev.set(key(from.col, from.row), "");
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length > 0) {
    const [col, row] = queue.shift()!;
    if (col === goal.col && row === goal.row) break;
    for (const [dx, dy] of dirs) {
      const nextCol = col + dx;
      const nextRow = row + dy;
      const id = key(nextCol, nextRow);
      if (prev.has(id)) continue;
      const isGoal = nextCol === goal.col && nextRow === goal.row;
      if (!isGoal && !walkable(nextCol, nextRow, blocked)) continue;
      if (isGoal && SOLID.has(tileAt(nextCol, nextRow))) continue;
      prev.set(id, key(col, row));
      queue.push([nextCol, nextRow]);
    }
  }
  const goalKey = key(goal.col, goal.row);
  if (!prev.has(goalKey)) return null;
  let current = goalKey;
  let parent = prev.get(current) ?? "";
  while (parent && parent !== key(from.col, from.row)) {
    current = parent;
    parent = prev.get(current) ?? "";
  }
  const [col, row] = current.split(",").map(Number);
  return { col, row, face: faceToward(from, { col, row }) };
}

function approachGoal(from: Spot, player: { col: number; row: number }) {
  const blocked = new Set([`${player.col},${player.row}`]);
  const candidates = [
    { col: player.col + 1, row: player.row },
    { col: player.col - 1, row: player.row },
    { col: player.col, row: player.row + 1 },
    { col: player.col, row: player.row - 1 },
  ].filter(
    (cell) =>
      walkable(cell.col, cell.row, blocked) || (cell.col === from.col && cell.row === from.row),
  );
  for (const cell of candidates) {
    if (cell.col === from.col && cell.row === from.row) return cell;
  }
  let best: { col: number; row: number } | null = null;
  let bestScore = Infinity;
  for (const cell of candidates) {
    const step = nextStep(from, cell, blocked);
    if (!step) continue;
    const score = Math.abs(cell.col - from.col) + Math.abs(cell.row - from.row);
    if (score < bestScore) {
      best = cell;
      bestScore = score;
    }
  }
  return best;
}

function freeSpot(options: Array<{ col: number; row: number }>, taken: { col: number; row: number }) {
  return (
    options.find(
      (spot) =>
        (spot.col !== taken.col || spot.row !== taken.row) &&
        walkable(spot.col, spot.row, new Set([`${taken.col},${taken.row}`])),
    ) ?? options[0]
  );
}

function Token({ kind, face }: { kind: string; face: Dir }) {
  const art = SPRITE[kind] ?? SPRITE.orderly;
  const src = face === "up" ? art.back : art.front;
  return <img src={src} alt="" className={face === "left" ? "is-flip" : ""} />;
}

export function ReceptionScreen({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const index = Math.min(state.cleared, CASES.length - 1);
  const kase = CASES[index];
  const hero = state.hero ? heroById(state.hero) : heroById("infectologo");
  const [col, setCol] = useState(12);
  const [row, setRow] = useState(3);
  const [face, setFace] = useState<Dir>("left");
  const [tick, setTick] = useState(0);
  const [nurse, setNurse] = useState<Spot>({ col: 8, row: 2, face: "right" });
  const [patient, setPatient] = useState<Spot | null>(null);
  const [phase, setPhase] = useState<Phase>("seek");
  const [talk, setTalk] = useState<{ who: Speaker; line: number } | null>(null);
  const [dest, setDest] = useState<{ col: number; row: number } | null>(null);
  const [note, setNote] = useState("La enfermera viene con el cultivo. Espere en el consultorio.");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        move(event.key);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const wrap = document.querySelector(".overhead-wrap");
    const you = document.querySelector("[data-you]");
    if (!(wrap instanceof HTMLElement) || !(you instanceof HTMLElement)) return;
    if (wrap.scrollWidth <= wrap.clientWidth + 8) return;
    you.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [col, row]);

  useEffect(() => {
    if (talk) return;
    const id = window.setInterval(() => {
      if (dest) {
        const result = takeStep(dest.col, dest.row);
        if (result !== "moved") setDest(null);
      }
      if (phase === "seek") {
        const goal = approachGoal(nurse, { col, row });
        if (!goal) return;
        if (goal.col === nurse.col && goal.row === nurse.row) {
          audio.ui();
          setTalk({ who: "nurse", line: 0 });
          setNurse((current) => ({ ...current, face: faceToward(current, { col, row }) }));
          return;
        }
        const step = nextStep(nurse, goal, new Set([`${col},${row}`]));
        if (step) setNurse(step);
        return;
      }
      if (phase === "retire") {
        const park = freeSpot(PARKS, { col, row });
        if (nurse.col === park.col && nurse.row === park.row) {
          setPhase("escort");
          return;
        }
        const step = nextStep(nurse, park, new Set([`${col},${row}`]));
        if (step) setNurse(step);
        else setPhase("escort");
        return;
      }
      if (phase === "escort") {
        if (!patient) {
          const start = freeSpot(
            [
              { col: 8, row: 2 },
              { col: 7, row: 2 },
              { col: 9, row: 3 },
            ],
            { col, row },
          );
          setPatient({ ...start, face: "right" });
          setNote("El paciente entra al consultorio.");
          return;
        }
        const seat = freeSpot(SEATS, { col, row });
        if (patient.col === seat.col && patient.row === seat.row) {
          setPhase("ready");
          setNote("El paciente ya está sentado. Acérquese y toque el recuadro, o pulse espacio.");
          return;
        }
        const blocked = new Set([`${col},${row}`, `${nurse.col},${nurse.row}`]);
        const step = nextStep(patient, seat, blocked);
        if (step) setPatient(step);
      }
    }, 420);
    return () => window.clearInterval(id);
  });

  function script(who: Speaker) {
    if (who === "nurse") {
      if (phase !== "seek") return ["El paciente ya tiene la ficha. Cuando esté sentado, pulse espacio junto a él."];
      return [
        `Buenos días. Soy la enfermera del servicio. Traigo un cultivo a su consultorio, ${hero.name.toLowerCase()}.`,
        kase.banner,
        `${hero.name}: ${hero.gift} ${hero.limit}`,
        `Cama ${kase.bed}. ${kase.title}. El paciente entra ahora. Cuando esté sentado, acérquese y toque el recuadro, o pulse espacio.`,
      ];
    }
    if (who === "patient") {
      return [
        `Cama ${kase.bed}. ${kase.title}. El cultivo de ${kase.bacteria} ya está en la ficha.`,
        "Cuando quiera, empezamos. El informe ya dice qué cubre este cultivo.",
      ];
    }
    return ["La enfermera trae a cada paciente hasta este consultorio. Usted no tiene que salir a buscarlo."];
  }

  function occupied(nextCol: number, nextRow: number): Speaker | null {
    if (nextCol === nurse.col && nextRow === nurse.row) return "nurse";
    if (patient && nextCol === patient.col && nextRow === patient.row) return "patient";
    if (nextCol === ORDERLY.col && nextRow === ORDERLY.row) return "orderly";
    return null;
  }

  function adjacent(target: { col: number; row: number }) {
    return Math.abs(col - target.col) + Math.abs(row - target.row) === 1;
  }

  function openTalk(who: Speaker) {
    if (who === "patient" && phase !== "ready") return false;
    audio.ui();
    setTalk({ who, line: 0 });
    return true;
  }

  function takeStep(targetCol: number, targetRow: number): "moved" | "talk" | "stop" {
    if (talk) return "stop";
    if (targetCol === col && targetRow === row) return "stop";
    const who = occupied(targetCol, targetRow);
    if (who && adjacent({ col: targetCol, row: targetRow })) {
      return openTalk(who) ? "talk" : "stop";
    }
    const blocked = new Set([`${nurse.col},${nurse.row}`, `${ORDERLY.col},${ORDERLY.row}`]);
    if (patient) blocked.add(`${patient.col},${patient.row}`);
    const step = nextStep({ col, row, face }, { col: targetCol, row: targetRow }, blocked);
    if (!step) return "stop";
    const landed = occupied(step.col, step.row);
    if (landed) return openTalk(landed) ? "talk" : "stop";
    setFace(step.face);
    setCol(step.col);
    setRow(step.row);
    setTick((value) => value + 1);
    return "moved";
  }

  function walkTo(targetCol: number, targetRow: number) {
    if (talk) return;
    const result = takeStep(targetCol, targetRow);
    setDest(result === "moved" ? { col: targetCol, row: targetRow } : null);
  }

  function advanceTalk() {
    if (!talk) return;
    const lines = script(talk.who);
    if (talk.line < lines.length - 1) {
      audio.ui();
      setTalk({ who: talk.who, line: talk.line + 1 });
      return;
    }
    if (talk.who === "nurse" && phase === "seek") {
      setPhase("retire");
      setTalk(null);
      setNote("Ficha recibida. El paciente va a entrar.");
      audio.ui();
      return;
    }
    if (talk.who === "patient" && phase === "ready") {
      audio.ui();
      dispatch({ type: "admit" });
      return;
    }
    setTalk(null);
    audio.ui();
  }

  function confirm() {
    if (talk) {
      advanceTalk();
      return;
    }
    if (phase === "ready" && patient && adjacent(patient)) {
      audio.ui();
      setTalk({ who: "patient", line: 0 });
      return;
    }
    if (phase === "seek" && adjacent(nurse)) {
      audio.ui();
      setTalk({ who: "nurse", line: 0 });
      return;
    }
    if (adjacent(ORDERLY)) {
      audio.ui();
      setTalk({ who: "orderly", line: 0 });
    }
  }

  function move(key: string) {
    if (talk) return;
    setDest(null);
    const delta =
      key === "ArrowLeft" ? [-1, 0] : key === "ArrowRight" ? [1, 0] : key === "ArrowUp" ? [0, -1] : [0, 1];
    const nextFace: Dir = key === "ArrowLeft" ? "left" : key === "ArrowRight" ? "right" : key === "ArrowUp" ? "up" : "down";
    setFace(nextFace);
    const nextCol = col + delta[0];
    const nextRow = row + delta[1];
    const who = occupied(nextCol, nextRow);
    if (who === "patient" && phase === "ready") {
      audio.ui();
      setTalk({ who: "patient", line: 0 });
      return;
    }
    if (who === "nurse" && phase === "seek") {
      audio.ui();
      setTalk({ who: "nurse", line: 0 });
      return;
    }
    if (who) return;
    if (SOLID.has(tileAt(nextCol, nextRow))) return;
    setCol(nextCol);
    setRow(nextRow);
    setTick((value) => value + 1);
  }

  const lines = talk ? script(talk.who) : [];
  const last = talk !== null && talk.line === lines.length - 1;
  const showChart = talk?.who === "nurse" && phase === "seek" && talk.line >= 1;

  return (
    <section className="reception">
      <header className="floor-sign">
        <span>Consultorio de {hero.name}</span>
        <strong>
          {FLOORS[index]} · cama {kase.bed}
        </strong>
      </header>
      <p className="aim-line">{kase.banner}</p>
      <div className="overhead-wrap">
        <div
          className="overhead"
          style={{ ["--cols" as string]: String(COLS), ["--rows" as string]: String(ROWS) }}
        >
          {MAP.map((line, mapRow) =>
            [...line].map((mark, mapCol) => (
              <i
                key={`${mapCol}-${mapRow}`}
                className={`tile tile-${tileClass(mark)}`}
                onClick={() => walkTo(mapCol, mapRow)}
              >
                {PROP[mark] && <img className="prop" src={PROP[mark]} alt="" />}
              </i>
            )),
          )}
          <Pawn col={ORDERLY.col} row={ORDERLY.row} kind="orderly" face="down" label="Camillero" />
          <Pawn col={nurse.col} row={nurse.row} kind="nurse" face={nurse.face} label="Enfermera" mark={phase === "seek"} step={nurse.col + nurse.row} />
          {patient && (
            <Pawn
              col={patient.col}
              row={patient.row}
              kind="patient"
              face={patient.face}
              label="Paciente"
              mark={phase !== "seek"}
              step={patient.col + patient.row}
            />
          )}
          <Pawn col={col} row={row} kind={hero.id} face={face} label={hero.name} step={tick} you />
        </div>
      </div>
      <div className={`dialog ${talk ? "has-portrait" : ""}`} onClick={confirm} role="status">
        {talk && <img className="dialog-portrait" src={PORTRAIT[talk.who]} alt="" />}
        <span>
          <p className="dialog-name">{talk ? NAMES[talk.who] : hero.name}</p>
          <p className="dialog-line">{talk ? lines[talk.line] : note}</p>
          {showChart && (
            <span className="dialog-ficha">
              <img src={kase.photo} alt="" />
              <span>
                <strong>
                  Cultivo · cama {kase.bed}
                </strong>
                <em>
                  {kase.bacteria} · {kase.title}
                </em>
              </span>
            </span>
          )}
          <small>
            {talk
              ? last && talk.who === "patient"
                ? "Toque o espacio para empezar el caso"
                : "Toque o espacio para seguir"
              : phase === "ready"
                ? "Toque aquí, o espacio, junto al paciente"
                : "Toque el suelo para caminar. Toque aquí para hablar."}
          </small>
        </span>
      </div>
    </section>
  );
}

function tileClass(mark: string) {
  if (mark === "#") return "wall";
  if (mark === "S") return "sofa";
  if (mark === "D") return "desk";
  if (mark === "W") return "plant";
  if (mark === "B") return "bed";
  if (mark === "H") return "chair";
  if (mark === "+") return "door";
  return "floor";
}

function Pawn({
  col,
  row,
  kind,
  face,
  label,
  step = 0,
  mark = false,
  you = false,
}: {
  col: number;
  row: number;
  kind: HeroId | Speaker;
  face: Dir;
  label: string;
  step?: number;
  mark?: boolean;
  you?: boolean;
}) {
  return (
    <span
      className={`pawn ${mark ? "is-next" : ""}`}
      data-you={you ? "" : undefined}
      style={{ ["--c" as string]: String(col), ["--r" as string]: String(row) }}
    >
      <Token key={step} kind={kind} face={face} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
