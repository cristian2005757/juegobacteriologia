import { CARDS, MECHANISMS } from "../game/data";
import type { Assessment, CardId } from "../game/types";
import { MECHANISM_SRC } from "./art";

export function CardView({
  id,
  assessment,
  short,
  price,
  bonus = 0,
  quiet = false,
  onClick,
}: {
  id: CardId;
  assessment?: Assessment | null;
  short?: boolean;
  price?: number;
  bonus?: number;
  quiet?: boolean;
  onClick?: () => void;
}) {
  const card = CARDS[id];
  const mechanism = MECHANISMS[card.mechanism];
  const known = Boolean(assessment);
  const fits = assessment?.fits ?? false;
  const damage = assessment && fits ? assessment.damage : card.baseDamage;
  const slow = assessment && fits ? assessment.slow : card.baseSlow;
  const self = assessment && fits ? assessment.self : card.selfDamage;

  const className = [
    "card",
    known && fits ? "is-fit" : "",
    known && !fits ? "is-nope" : "",
    short ? "is-short" : "",
    quiet ? "is-quiet" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div className="card-top">
        <span className="family">{card.family}</span>
        <span className={`cost ${price !== undefined && price < card.cost ? "is-cut" : ""}`}>
          {price ?? card.cost}
        </span>
      </div>
      <h3>{card.name}</h3>
      <span className="mech-chip">
        <img src={MECHANISM_SRC[card.mechanism]} alt="" />
        {mechanism.short}
      </span>
      <p className="effect-name">{card.effect}</p>
      <p className="card-line">{card.line}</p>
      <div className="card-foot">
        {known && !fits ? (
          <strong>Ahora: 0</strong>
        ) : (
          <strong>
            {bonus > 0
              ? `${Math.max(0, damage - bonus)} + ${bonus} de daño`
              : damage > 0
                ? `${damage} de daño`
                : "Sin daño directo"}
            {slow > 0 ? ` · frena ${slow}` : ""}
          </strong>
        )}
        {self > 0 && fits !== false && <em>−{self} al paciente</em>}
        {known ? (
          <span className={`lamp ${fits ? "on" : "off"}`}>{fits ? "Encaja" : "No encaja"}</span>
        ) : (
          <span className="when">{card.when}</span>
        )}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className={className} data-mechanism={card.mechanism}>
        {body}
      </div>
    );
  }

  return (
    <button type="button" className={className} data-mechanism={card.mechanism} onClick={onClick} disabled={quiet}>
      {body}
    </button>
  );
}
