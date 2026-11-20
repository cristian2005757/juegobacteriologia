import { useEffect, useState } from "react";
import { CARDS, CASES, MECHANISMS, TABLE } from "../game/data";
import type { Action, GameState } from "../game/logic";
import { tally } from "../game/logic";
import type { Mechanism } from "../game/types";
import { audio } from "../game/audio";
import { heroById } from "../game/heroes";
import { MECHANISM_SRC, Party } from "./art";
import { CardView } from "./CardView";
import { MuteButton } from "./sound";
import { TowerMap } from "./TowerMap";

const ORDER: Mechanism[] = ["pared", "proteina", "acidos", "membrana", "metabolica"];
const NAME_KEY = "selectiva-nombre";

export function TitleScreen({ dispatch }: { dispatch: (action: Action) => void }) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  function rename(value: string) {
    const next = value.slice(0, 48);
    setName(next);
    localStorage.setItem(NAME_KEY, next);
  }

  return (
    <section className="shell screen title-screen">
      <div className="title-copy">
        <p className="kicker">Guardia de infectología</p>
        <h1>Selectiva</h1>
        <label className="author-field">
          <span>Tu nombre</span>
          <input
            value={name}
            maxLength={48}
            placeholder="Escribe tu nombre"
            autoComplete="name"
            onChange={(event) => rename(event.target.value)}
          />
        </label>
        <p className="lede">
          Cada carta es un antibiótico. Solo baja el cultivo si esta bacteria todavía tiene el sitio que ese fármaco reconoce.
        </p>
        <ol className="how">
          <li>
            <b>1</b>
            <span>
              <strong>El círculo de la carta es la dosis.</strong> Jugarla gasta esa cantidad. Cada turno vuelves a tener dosis: 3, o 2 si entras como farmacéutico.
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>Luz verde:</strong> el antibiótico encaja y baja el cultivo. <strong>Luz roja:</strong> aquí no sirve, y la dosis igual se gasta.
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>Bactericida</strong> baja el cultivo. <strong>Bacteriostático</strong> lo baja menos y además frena el ataque que viene.
            </span>
          </li>
          <li>
            <b>4</b>
            <span>
              <strong>Cerrar el turno</strong> deja que el microorganismo baje el estado clínico del paciente. Si ese número llega a cero, se pierde el caso.
            </span>
          </li>
          <li>
            <b>5</b>
            <span>
              En el consultorio, camina con las flechas o tocando el suelo. Habla con espacio o tocando el recuadro de abajo.
            </span>
          </li>
        </ol>
        <div className="title-actions">
          <button type="button" className="btn" onClick={() => { audio.unlock(); audio.ui(); dispatch({ type: "start" }); }}>
            Entrar a la guardia
          </button>
          <button type="button" className="btn ghost" onClick={() => { audio.unlock(); dispatch({ type: "codex" }); }}>
            Ver los mecanismos
          </button>
          <MuteButton />
        </div>
        <ul className="mech-strip">
          {ORDER.map((id) => (
            <li key={id} data-mechanism={id}>
              {MECHANISMS[id].short}
            </li>
          ))}
        </ul>
      </div>
      <div className="title-party">
        <Party />
      </div>
    </section>
  );
}

export function CodexScreen({ dispatch }: { dispatch: (action: Action) => void }) {
  return (
    <section className="shell screen codex">
      <header className="sheet-head">
        <div>
          <p className="kicker">Atlas</p>
          <h1>Las cinco dianas</h1>
        </div>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: "back" })}>
          Volver
        </button>
      </header>
      <p className="lede narrow">
        El antibiótico busca una estructura esencial para la bacteria y ausente, o muy distinta, en la célula humana. Esa diferencia es la toxicidad selectiva.
      </p>
      <div className="codex-list">
        {ORDER.map((id, index) => {
          const item = MECHANISMS[id];
          return (
            <article key={id} data-mechanism={id}>
              <img className="codex-art" src={MECHANISM_SRC[id]} alt="" />
              <p className="index">0{index + 1}</p>
              <h2>{item.label}</h2>
              <p>{item.idea}</p>
              <p>{item.how}</p>
              <p className="resist">
                <strong>Resistencia. </strong>
                {item.resist}
              </p>
            </article>
          );
        })}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mecanismo</th>
              <th>Diana</th>
              <th>Familias</th>
              <th>Efecto</th>
            </tr>
          </thead>
          <tbody>
            {TABLE.map((row) => (
              <tr key={row.mecanismo}>
                <td>{row.mecanismo}</td>
                <td>{row.diana}</td>
                <td>{row.ejemplos}</td>
                <td>{row.efecto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="disclaimer">
        Modelo para estudiar. La cobertura real depende de la especie, el foco y el antibiograma. Micrografías: CDC y USDA, dominio público; NIAID, CC BY 2.0.
      </p>
    </section>
  );
}

export function MapScreen({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const cards = tally(state.deck);
  return (
    <section className="shell screen map-screen">
      <header className="sheet-head">
        <div>
          <p className="kicker">Torre de guardia</p>
          <h1>El edificio</h1>
          <div className="roster" aria-hidden="true">
            <img src={state.hero ? heroById(state.hero).sprite : "/allies/doctor.png"} alt="" />
            <img src="/allies/nurse.png" alt="" />
            <img src="/allies/patient.png" alt="" />
          </div>
        </div>
        <div className="title-actions">
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: "lobby" })}>
            Recepción
          </button>
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: "codex" })}>
            Mecanismos
          </button>
          <button type="button" className="text-btn" onClick={() => dispatch({ type: "restart" })}>
            Reiniciar
          </button>
        </div>
      </header>
      <TowerMap
        cleared={state.cleared}
        sprite={state.hero ? heroById(state.hero).sprite : "/allies/doctor.png"}
        dispatch={dispatch}
      />
      <div className="deck-line">
        <p className="kicker">Mazo · {state.deck.length}</p>
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              <span className="chip" data-mechanism={CARDS[card.id].mechanism}>
                {CARDS[card.id].name}
                {card.count > 1 ? ` ×${card.count}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BriefScreen({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const kase = CASES[state.caseIndex];
  return (
    <section className="shell screen handoff">
      <div className="er-room" aria-hidden="true" />
      <div className="handoff-nurse">
        <img src="/allies/nurse.png" alt="Enfermera de la guardia" />
        <p className="speech">
          {state.hero ? heroById(state.hero).name : "Doctor"}, cama {kase.bed}. Le dejo el informe antes de entrar. Si cierra el turno, la bacteria ataca al paciente.
        </p>
      </div>
      <article className="chart">
        <header className="chart-head">
          <p className="kicker">Informe de urgencias</p>
          <span>Cama {kase.bed}</span>
        </header>
        <h1>{kase.title}</h1>
        <div className="chart-bug">
          <img src={kase.photo} alt={`Micrografía de ${kase.bacteria}`} />
          <div>
            <p className="chart-species">
              <em>{kase.bacteria}</em>
            </p>
            <p className="chart-meta">Micrografía real · {kase.credit}</p>
          </div>
        </div>
        <p className="paper-lead">{kase.objective}</p>
        <ul className="traits dark">
          {kase.traits.map((trait) => (
            <li key={trait.label} className={trait.tone}>
              <strong>{trait.label}</strong>
              <span>{trait.detail}</span>
            </li>
          ))}
        </ul>
        <p className="chart-warn">
          Ataque bacteriano: {kase.attack + (state.hero === "infectologo" ? 1 : 0)} de estabilidad por turno, salvo que una carta bacteriostática lo frene.
          {state.hero ? ` ${heroById(state.hero).name}: ${heroById(state.hero).gift} ${heroById(state.hero).limit}` : ""}
        </p>
        <div className="title-actions">
          <button
            type="button"
            className="btn dark"
            onClick={() => {
              audio.unlock();
              audio.ui();
              dispatch({ type: "begin" });
            }}
          >
            Entrar con el informe
          </button>
          <button type="button" className="text-btn dark" onClick={() => dispatch({ type: "lobby" })}>
            Volver al consultorio
          </button>
        </div>
      </article>
    </section>
  );
}

export function DebriefScreen({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const kase = CASES[state.caseIndex];
  const last = !kase.reward;
  return (
    <section className="shell screen brief-screen">
      <article className="paper narrow-paper">
        <p className="kicker">Cama {kase.bed} · {kase.bacteria}</p>
        <h1>Lo que pasó en el cultivo</h1>
        <ul className="bitacora">
          {(state.combat?.journal ?? []).map((entry, index) => (
            <li key={`${entry.title}-${index}`} className={entry.ok ? "ok" : "bad"}>
              <strong>{entry.title}</strong>
              <span>{entry.body}</span>
            </li>
          ))}
        </ul>
        <h2>{kase.lessonTitle}</h2>
        <ol className="points">
          {kase.lessonPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <button type="button" className="btn dark" onClick={() => dispatch({ type: "continue" })}>
          {last ? "Cerrar la guardia" : "Elegir una carta"}
        </button>
      </article>
    </section>
  );
}

export function RewardScreen({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const kase = CASES[state.caseIndex];
  return (
    <section className="shell screen reward-screen">
      <p className="kicker">El mazo crece</p>
      <h1>Elige una carta</h1>
      <p className="lede narrow">{kase.nextHint}</p>
      <div className="reward-grid">
        {state.rewardOptions.map((id) => (
          <button key={id} type="button" className="reward-pick" onClick={() => dispatch({ type: "pick", id })}>
            <CardView id={id} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function EndingScreen({ dispatch }: { dispatch: (action: Action) => void }) {
  return (
    <section className="shell screen codex">
      <p className="kicker">Guardia completa</p>
      <h1>La diana era la diferencia</h1>
      <p className="lede narrow">
        Ningún antibiótico de esta guardia sirve para todo. Sirve el que encuentra una estructura que la bacteria necesita y la célula humana no usa igual: la pared, el ribosoma 70S, una enzima del ADN, el LPS o la fábrica de folato.
      </p>
      <div className="ending-party">
        <Party win />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mecanismo</th>
              <th>Diana</th>
              <th>Familias</th>
              <th>Efecto</th>
            </tr>
          </thead>
          <tbody>
            {TABLE.map((row) => (
              <tr key={row.mecanismo}>
                <td>{row.mecanismo}</td>
                <td>{row.diana}</td>
                <td>{row.ejemplos}</td>
                <td>{row.efecto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="title-actions">
        <button type="button" className="btn" onClick={() => dispatch({ type: "restart" })}>
          Volver a empezar
        </button>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: "codex" })}>
          Repasar mecanismos
        </button>
      </div>
      <p className="disclaimer">
        Modelo para estudiar. La cobertura real depende de la especie, el foco y el antibiograma. Micrografías: CDC y USDA, dominio público; NIAID, CC BY 2.0.
      </p>
    </section>
  );
}
