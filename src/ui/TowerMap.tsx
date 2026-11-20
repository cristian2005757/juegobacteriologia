import { useEffect, useState } from "react";
import { CASES } from "../game/data";
import { audio } from "../game/audio";
import type { Action } from "../game/logic";

const ROOMS = [
  "Consultorio de garganta",
  "Consultorio de vías urinarias",
  "Consultorio de abdomen",
  "Consultorio de piel",
  "Consultorio de sepsis",
];

const TILES = 11;
const STAIRS_DOWN = 0;
const DOOR = 7;
const STAIRS_UP = 10;

export function TowerMap({
  cleared,
  sprite = "/allies/doctor.png",
  dispatch,
}: {
  cleared: number;
  sprite?: string;
  dispatch: (action: Action) => void;
}) {
  const top = CASES.length - 1;
  const [floor, setFloor] = useState(() => Math.min(cleared, top));
  const [tile, setTile] = useState(3);
  const [face, setFace] = useState<"left" | "right">("right");
  const [dir, setDir] = useState<"up" | "down">("up");
  const [note, setNote] = useState("Flechas para caminar. El consultorio está al fondo del pasillo.");

  useEffect(() => {
    const next = Math.min(cleared, top);
    setFloor(next);
    setTile(3);
    setFace("right");
    setNote(`${ROOMS[next]}. Camina hasta la puerta.`);
  }, [cleared, top]);

  function arrive(next: number, from: "up" | "down") {
    setDir(from);
    setFloor(next);
    setTile(from === "up" ? STAIRS_DOWN + 1 : STAIRS_UP - 1);
    setFace(from === "up" ? "right" : "left");
    setNote(`Piso ${next + 1}. ${ROOMS[next]}.`);
    audio.ui();
  }

  function tryUp() {
    if (floor >= top) {
      setNote("Este es el último piso de la torre.");
      return;
    }
    if (floor >= cleared) {
      setNote("La escalera de arriba sigue cerrada. Primero este consultorio.");
      return;
    }
    arrive(floor + 1, "up");
  }

  function tryDown() {
    if (floor <= 0) {
      setNote("Ya estás en la planta del primer consultorio.");
      return;
    }
    arrive(floor - 1, "down");
  }

  function tryEnter() {
    if (floor === cleared) {
      audio.ui();
      dispatch({ type: "open-case", index: floor });
      return;
    }
    if (floor < cleared) setNote("Esta consulta ya se cerró. El piso de arriba es el que sigue.");
    else setNote("Esa puerta no abre todavía.");
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a") && (event.key === "Enter" || event.key === " ")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setFace("right");
        setTile((value) => Math.min(TILES - 1, value + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFace("left");
        setTile((value) => Math.max(0, value - 1));
      } else if (event.key === "ArrowUp" || event.key === "Enter") {
        event.preventDefault();
        if (tile === DOOR || tile === DOOR - 1) tryEnter();
        else if (tile >= STAIRS_UP - 1) tryUp();
        else setNote("Acércate a la puerta o a las escaleras.");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (tile <= STAIRS_DOWN + 1) tryDown();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const kase = CASES[floor];
  const doorState = floor < cleared ? "done" : floor === cleared ? "open" : "locked";

  return (
    <div className="tower">
      <ol className="lift">
        {CASES.map((item, index) => {
          const number = CASES.length - index;
          const real = number - 1;
          const locked = real > cleared;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={real === floor ? "here" : real === cleared ? "goal" : ""}
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  arrive(real, real > floor ? "up" : "down");
                }}
              >
                <span>P{number}</span>
                <small>{ROOMS[real].replace("Consultorio de ", "")}</small>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="corridor">
        <div className={`room from-${dir}`} key={floor}>
          <div className="room-sign">
            <span>Piso {floor + 1}</span>
            <strong>{ROOMS[floor]}</strong>
          </div>
          <button
            type="button"
            className={`room-door is-${doorState}`}
            onClick={() => {
              setTile(DOOR);
              setFace("right");
              tryEnter();
            }}
          >
            <img src={kase.sprite} alt="" />
            <span>{kase.title}</span>
            <small>{doorState === "done" ? "Consulta cerrada" : doorState === "open" ? "Entrar" : "Cerrado"}</small>
          </button>
          {floor === cleared && <img className="door-nurse" src="/allies/nurse.png" alt="" />}
          <button type="button" className="stair stair-down" onClick={tryDown} disabled={floor === 0}>
            Bajar
          </button>
          <button type="button" className="stair stair-up" onClick={tryUp} disabled={floor >= cleared || floor >= top}>
            Subir
          </button>
          <div className="tiles" aria-hidden="true">
            {Array.from({ length: TILES }, (_, index) => (
              <i key={index} className={index === tile ? "is-you" : ""} />
            ))}
          </div>
          <div className={`walker face-${face}`} style={{ ["--tile" as string]: String(tile) }}>
            <img src={sprite} alt="Caminando por el pasillo" />
          </div>
        </div>
        <p className="poke-box">{note}</p>
      </div>
    </div>
  );
}
