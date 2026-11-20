import type { Mechanism } from "../game/types";

export const MECHANISM_SRC: Record<Mechanism, string> = {
  pared: "/art/pared.png",
  proteina: "/art/proteina.png",
  acidos: "/art/acidos.png",
  membrana: "/art/membrana.png",
  metabolica: "/art/folato.png",
};

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="lab-grid" />
    </div>
  );
}

export function Mark() {
  return (
    <div className="mark" aria-hidden="true">
      <span />
      <span />
      <i />
    </div>
  );
}

export function Organism({
  sprite,
  photo,
  fx,
  fxKey,
  motion,
  motionKey,
  defeated,
  hp,
  hpMax,
  name,
  compact,
  bare,
}: {
  sprite: string;
  photo: string;
  fx: Mechanism | "miss";
  fxKey: number;
  motion: "idle" | "shake" | "lunge";
  motionKey: number;
  defeated?: boolean;
  hp: number;
  hpMax: number;
  name: string;
  compact?: boolean;
  bare?: boolean;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ratio = hpMax === 0 ? 0 : Math.max(0, Math.min(1, hp / hpMax));
  const tone = ratio > 0.55 ? "#b6d98a" : ratio > 0.28 ? "#e2b15a" : "#ef7d78";
  const showStamp = fxKey > 0 && fx !== "miss";

  return (
    <div className={`organism-block ${compact ? "is-compact" : ""}`}>
      <div className="ring-wrap">
        {!compact && !bare && (
          <svg className="hp-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} className="ring-track" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="ring-value"
              style={{
                stroke: tone,
                strokeDasharray: circumference,
                strokeDashoffset: circumference * (1 - ratio),
              }}
            />
          </svg>
        )}
        {!bare && <div className="reticle" />}
        <div key={motionKey} className={`mover ${defeated ? "idle" : motion}`}>
          <div className={`floater ${defeated ? "is-down" : ""}`}>
            <img className={`sprite hit-${fx}`} src={sprite} alt="" />
            {showStamp && (
              <img key={fxKey} className="mech-stamp" src={MECHANISM_SRC[fx]} alt="" />
            )}
            <span className="burst" key={`b-${fxKey}`} data-fx={fx} aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <i key={index} style={{ ["--a" as string]: `${index * 30}deg` }} />
              ))}
            </span>
          </div>
        </div>
      </div>
      {!bare && (
        <div className="species-row">
          <img className="micro-photo" src={photo} alt={`Micrografía de ${name}`} />
          <p className="species">
            <em>{name}</em>
          </p>
        </div>
      )}
      {!compact && !bare && (
        <p className="viability">
          {hp}
          <span> / {hpMax}</span>
        </p>
      )}
    </div>
  );
}

export function Party({
  motion = "idle",
  motionKey = 0,
  weak = false,
  down = false,
  win = false,
  lead = "/allies/doctor.png",
  leadName = "Médico de la guardia",
}: {
  motion?: "idle" | "shake" | "lunge";
  motionKey?: number;
  weak?: boolean;
  down?: boolean;
  win?: boolean;
  lead?: string;
  leadName?: string;
}) {
  return (
    <div className={`ally-spot ${weak ? "is-weak" : ""} ${down ? "is-down" : ""} ${win ? "is-win" : ""}`}>
      <div className="platform ally-platform" aria-hidden="true" />
      <div key={motionKey} className={`party-mover ${motion}`}>
        <img className="ally nurse" src="/allies/nurse.png" alt="" />
        <img className="ally patient" src="/allies/patient.png" alt="Paciente" />
        <img className="ally doctor" src={lead} alt={leadName} />
      </div>
    </div>
  );
}

export function Ecg({ hot }: { hot: number }) {
  return (
    <svg className={`ecg ${hot ? "is-hot" : ""}`} viewBox="0 0 280 42" aria-hidden="true" key={hot}>
      <path d="M0 22 H46 L58 22 L68 8 L80 34 L92 22 H150 L162 22 L174 6 L190 36 L202 22 H280" />
    </svg>
  );
}
