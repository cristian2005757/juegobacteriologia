import { useEffect, useRef, useState } from "react";
import { audio } from "../game/audio";
import { assess, CASES, CARDS } from "../game/data";
import { cardPrice, heroById } from "../game/heroes";
import type { Action } from "../game/logic";
import { previewContext } from "../game/logic";
import type { CardId, CombatState, Trait } from "../game/types";
import { Ecg, MECHANISM_SRC, Organism, Party } from "./art";
import { CardView } from "./CardView";
import { MuteButton } from "./sound";

function liveTraits(traits: Trait[], tags: readonly string[]): Trait[] {
  return traits.map((trait) => {
    if (trait.id === "lps" && tags.includes("mcr1")) {
      return {
        ...trait,
        label: "LPS con mcr-1",
        detail: "Perdió carga negativa. La colistina ya no se ancla.",
        tone: "bad",
      };
    }
    if (trait.id === "adn" && tags.includes("efflux")) {
      return {
        ...trait,
        label: "Bombas de expulsión",
        detail: "La ciprofloxacina llega a la girasa, pero una parte vuelve a salir.",
        tone: "warn",
      };
    }
    return trait;
  });
}

export function CombatScreen({
  combat,
  dispatch,
}: {
  combat: CombatState;
  dispatch: (action: Action) => void;
}) {
  const kase = CASES[combat.caseIndex];
  const [hover, setHover] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ id: CardId; ok: boolean; key: number } | null>(null);
  const [deny, setDeny] = useState(0);
  const heard = useRef(combat.motionKey);
  const heardEnd = useRef<"open" | "won" | "lost">("open");

  const expectedAttack = Math.max(0, combat.attack - combat.slow);
  const patientRatio = combat.patient / combat.patientMax;
  const hovered = hover !== null ? combat.hand[hover] : undefined;
  const hoveredView = hovered
    ? assess(hovered, previewContext(combat.tags, kase.id, combat.playedThisTurn, hovered))
    : null;

  const guided =
    combat.caseIndex === 0 &&
    combat.turn === 1 &&
    combat.hand.includes("penicilina") &&
    !combat.playedThisTurn.includes("penicilina");
  const warned = combat.caseIndex === 0 && combat.turn === 1 && combat.playedThisTurn.includes("penicilina");
  const roleNote =
    combat.hero === "farmaceutico"
      ? "2 dosis por turno"
      : combat.hero === "bacteriologo"
        ? "Si acierta: +3 al cultivo"
        : "La primera carta que encaja: −1 dosis";

  function tryPlay(index: number) {
    if (combat.won || combat.lost) return;
    const id = combat.hand[index];
    if (!id) return;
    if (guided && id !== "penicilina") return;
    const glance = assess(id, previewContext(combat.tags, kase.id, combat.playedThisTurn, id));
    if (cardPrice(combat.hero, CARDS[id].cost, glance.fits, combat.discountUsed) > combat.energy) {
      setDeny((value) => value + 1);
      return;
    }
    const result = assess(id, previewContext(combat.tags, kase.id, combat.playedThisTurn, id));
    setGhost({ id, ok: result.fits, key: combat.seq });
    setHover(null);
    dispatch({ type: "play", index });
  }

  useEffect(() => {
    if (heard.current === combat.motionKey) return;
    heard.current = combat.motionKey;
    if (combat.motion === "shake") {
      if (combat.fx === "miss") audio.resist();
      else audio.hit();
    } else if (combat.motion === "lunge") {
      audio.attack();
    }
  }, [combat.motionKey, combat.motion, combat.fx]);

  useEffect(() => {
    const end = combat.won ? "won" : combat.lost ? "lost" : "open";
    if (heardEnd.current === end) return;
    heardEnd.current = end;
    if (end === "won") audio.win();
    if (end === "lost") audio.lose();
  }, [combat.won, combat.lost]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "BUTTON" && (event.key === "Enter" || event.key === " ")) return;
      if (combat.won && event.key === "Enter") {
        dispatch({ type: "to-debrief" });
        return;
      }
      if (combat.lost && event.key === "Enter") {
        dispatch({ type: "retry" });
        return;
      }
      if (combat.won || combat.lost) return;
      if (event.key >= "1" && event.key <= "4") {
        tryPlay(Number(event.key) - 1);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (guided) return;
        dispatch({ type: "end-turn" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const enemyFloats = combat.floats.filter((item) => item.kind !== "patient" && item.kind !== "self");
  const selfFloats = combat.floats.filter((item) => item.kind === "self" || item.kind === "patient");

  const striking = combat.motion === "lunge";
  const strikeText = selfFloats[0]?.text ?? "ataca";

  return (
    <section className={`combat screen ${striking ? "is-struck" : ""}`}>
      <div className="er-room" aria-hidden="true" />
      <header className="topbar">
        <div>
          <p className="kicker">Cama {kase.bed} · {heroById(combat.hero).name}</p>
          <h1>{kase.title}</h1>
          <p className="role-note">{roleNote}</p>
        </div>
        <div className={`pips ${deny ? "is-fresh" : ""}`} key={deny}>
          <span>Dosis</span>
          {Array.from({ length: combat.energyMax }, (_, index) => (
            <i key={index} className={index < combat.energy ? "on" : ""} />
          ))}
        </div>
        <div className="top-meta">
          <span>Turno {combat.turn}</span>
          <span>
            Mazo {combat.drawPile.length} · Descarte {combat.discard.length}
          </span>
          {combat.caseIndex > 0 && (
            <button type="button" className="text-btn" onClick={() => dispatch({ type: "codex" })}>
              Mecanismos
            </button>
          )}
          <MuteButton />
        </div>
      </header>

      <div className="stage">
        <div className="arena">
          <p className="banner">
            <strong>Objetivo. </strong>
            {combat.banner}
          </p>
          <div className="duel">
            <article className="plate foe-plate">
              <img className="micro-photo" src={kase.photo} alt="" />
              <div className="plate-copy">
                <p className="plate-name">
                  <em>{kase.bacteria}</em>
                </p>
                <div className={`bar ${combat.hp / combat.hpMax < 0.28 ? "is-low" : combat.hp / combat.hpMax < 0.55 ? "is-mid" : ""}`}>
                  <span style={{ width: `${(combat.hp / combat.hpMax) * 100}%` }} />
                </div>
                <p className="plate-hp">
                  {combat.hp}
                  <span> / {combat.hpMax}</span>
                </p>
              </div>
            </article>

            <div className="foe-spot">
              <div className="platform foe-platform" aria-hidden="true" />
              <Organism
                bare
                sprite={kase.sprite}
                photo={kase.photo}
                fx={combat.fx}
                fxKey={combat.fxKey}
                motion={combat.motion}
                motionKey={combat.motionKey}
                defeated={combat.won}
                hp={combat.hp}
                hpMax={combat.hpMax}
                name={kase.bacteria}
              />
              <div className="floats">
                {enemyFloats.map((item) => (
                  <span key={item.id} className={`float float-${item.kind}`}>
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            <Party
              motion={combat.motion}
              motionKey={combat.motionKey}
              weak={patientRatio < 0.35}
              down={combat.lost}
              win={combat.won}
              lead={heroById(combat.hero).sprite}
              leadName={heroById(combat.hero).name}
            />

            <article className="plate ally-plate">
              <div className="plate-copy">
                <p className="plate-name">Estado clínico</p>
                <div className={`bar ${patientRatio < 0.35 ? "is-low" : patientRatio < 0.55 ? "is-mid" : ""}`}>
                  <span style={{ width: `${patientRatio * 100}%` }} />
                </div>
                <p className="plate-hp">
                  {combat.patient}
                  <span> / {combat.patientMax}</span>
                </p>
                <Ecg hot={combat.patientFxKey} />
                <p className="atk">
                  Ataque bacteriano {combat.attack}
                  {combat.slow > 0 ? ` → ${expectedAttack} este turno` : ""}
                </p>
              </div>
              <div className="self-floats">
                {selfFloats.map((item) => (
                  <span key={item.id} className={`float float-${item.kind}`}>
                    {item.text}
                  </span>
                ))}
              </div>
            </article>

            {combat.motion === "shake" && combat.fx !== "miss" && (
              <img key={combat.motionKey} className="dose" src={MECHANISM_SRC[combat.fx]} alt="" />
            )}
            {striking && (
              <div key={combat.motionKey} className="strike-layer" aria-hidden="true">
                <span className="infection-bolt" />
                <p className="strike-call">{strikeText === "frenada" ? "Frenada" : `Te ataca ${strikeText}`}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="ficha">
          <p className="kicker">Ficha</p>
          <ul className="traits">
            {liveTraits(kase.traits, combat.tags).map((trait) => (
              <li key={trait.label} className={trait.tone}>
                <strong>{trait.label}</strong>
                <span>{trait.detail}</span>
              </li>
            ))}
          </ul>
          <article className={`lesson ${combat.lesson.ok ? "ok" : "bad"}`} aria-live="polite" key={combat.lesson.title + combat.lesson.body}>
            <p className="kicker">{combat.lesson.ok ? "Qué ocurrió" : "Por qué no"}</p>
            <h2>{combat.lesson.title}</h2>
            <p>{combat.lesson.body}</p>
          </article>
          <p className="disclaimer">Micrografía real: {kase.credit}</p>
          {combat.journal.length > 1 && (
            <ul className="journal">
              {combat.journal.slice(0, -1).slice(-3).reverse().map((entry, index) => (
                <li key={`${entry.title}-${index}`} className={entry.ok ? "ok" : "bad"}>
                  <strong>{entry.title}</strong>
                  <span>{entry.body}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <p className="peek">
        {guided
          ? "Primer caso. Solo la penicilina está activa: es un β-lactámico y la diana es el peptidoglucano."
          : warned
            ? "La penicilina ya actuó. Si cierra el turno, el microorganismo agrede al paciente."
            : hovered && hoveredView
              ? `${CARDS[hovered].name}. ${hoveredView.body}`
              : "Pasa el cursor por una carta. El foco verde encaja con esta bacteria; el rojo explica, al jugarla, por qué la diana está cerrada."}
      </p>

      <div className="handbar">
        <div className="hand">
          {combat.hand.map((id, index) => {
            const view = assess(id, previewContext(combat.tags, kase.id, combat.playedThisTurn, id));
            const formulated = combat.hero === "farmaceutico";
            const shown = formulated
              ? {
                  ...view,
                  damage: view.damage + (view.synergy ? 6 : 0),
                  slow: view.slow + (view.fits && view.slow > 0 ? 2 : 0),
                }
              : combat.hero === "bacteriologo" && view.fits
                ? { ...view, damage: view.damage + 3 }
                : view;
            const price = cardPrice(combat.hero, CARDS[id].cost, view.fits, combat.discountUsed);
            const bonus = combat.hero === "bacteriologo" && view.fits ? 3 : 0;
            const locked = guided && id !== "penicilina";
            return (
              <div
                key={`${id}-${index}-${combat.turn}`}
                style={{ ["--i" as string]: index }}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
              >
                <CardView
                  id={id}
                  assessment={shown}
                  price={price}
                  bonus={bonus}
                  quiet={locked}
                  short={price > combat.energy}
                  onClick={() => tryPlay(index)}
                />
              </div>
            );
          })}
        </div>
        <button type="button" className={`end-btn ${expectedAttack > 0 ? "is-threat" : ""}`} onClick={() => dispatch({ type: "end-turn" })} disabled={combat.won || combat.lost || guided}>
          <span>Cerrar turno</span>
          <small>
            {guided ? "Primero la penicilina" : expectedAttack > 0 ? `El microorganismo agrede · −${expectedAttack}` : "Este turno no llega"}
          </small>
          <small className="key">Enter</small>
        </button>
      </div>

      {ghost && (
        <div
          className={`ghost-card ${ghost.ok ? "ok" : "miss"}`}
          key={ghost.key}
          onAnimationEnd={() => setGhost(null)}
        >
          <CardView id={ghost.id} />
        </div>
      )}

      {(combat.won || combat.lost) && (
        <div className="overlay">
          <div className="overlay-card">
            <p className="seal">{combat.won ? "Cedió" : "Avanza"}</p>
            <h2>{combat.won ? "La infección cedió" : "La infección avanzó"}</h2>
            <p>{combat.won ? kase.winLine : combat.lesson.body}</p>
            {combat.won ? (
              <button type="button" className="btn" onClick={() => dispatch({ type: "to-debrief" })}>
                Leer la lección
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => dispatch({ type: "retry" })}>
                Reintentar la cama
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
