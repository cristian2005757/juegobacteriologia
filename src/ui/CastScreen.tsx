import { HEROES } from "../game/heroes";
import type { HeroId } from "../game/heroes";
import { audio } from "../game/audio";
import type { Action } from "../game/logic";
import { useState } from "react";

export function CastScreen({ dispatch }: { dispatch: (action: Action) => void }) {
  const [picked, setPicked] = useState<HeroId>("infectologo");
  const hero = HEROES.find((item) => item.id === picked) ?? HEROES[0];

  return (
    <section className="shell screen cast-screen">
      <header className="sheet-head">
        <div>
          <p className="kicker">Antes de la guardia</p>
          <h1>Elige con quién entras</h1>
        </div>
      </header>
      <p className="lede">Tres formas de estar en la sala. Cada una abre una puerta y cierra otra.</p>
      <div className="cast-grid">
        {HEROES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`cast-card ${picked === item.id ? "is-on" : ""}`}
            onClick={() => {
              audio.ui();
              setPicked(item.id);
            }}
          >
            <img src={item.sprite} alt="" />
            <h2>{item.name}</h2>
            <p>{item.gift}</p>
            <p className="cast-limit">{item.limit}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          audio.unlock();
          audio.ui();
          dispatch({ type: "choose", hero: hero.id });
        }}
      >
        Entrar como {hero.name}
      </button>
    </section>
  );
}
