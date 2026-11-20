export type HeroId = "infectologo" | "farmaceutico" | "bacteriologo";

export interface HeroDef {
  id: HeroId;
  name: string;
  sprite: string;
  gift: string;
  limit: string;
}

export const HEROES: HeroDef[] = [
  {
    id: "infectologo",
    name: "Infectólogo",
    sprite: "/allies/doctor.png",
    gift: "Criterio clínico. La primera carta con la diana correcta cuesta 1 dosis menos.",
    limit: "La bacteria no está contenida: su agresión sube 1.",
  },
  {
    id: "farmaceutico",
    name: "Farmacéutico",
    sprite: "/allies/farmaceutico.png",
    gift: "Farmacocinética. El efecto bacteriostático frena 2 más, y el bloqueo secuencial del folato suma 6.",
    limit: "Prepara la dosis con calma: 2 dosis por turno.",
  },
  {
    id: "bacteriologo",
    name: "Bacteriólogo",
    sprite: "/allies/bacteriologo.png",
    gift: "Tinción de Gram. Si la carta acierta la diana, suma 3 de daño al cultivo.",
    limit: "El informe del cultivo tarda: el paciente entra con 8 menos de estado clínico.",
  },
];

export const FLOORS = [
  "Consultorio de garganta",
  "Consultorio de vías urinarias",
  "Consultorio de abdomen",
  "Consultorio de piel",
  "Consultorio de sepsis",
];

export function heroById(id: HeroId) {
  return HEROES.find((hero) => hero.id === id) ?? HEROES[0];
}

export function cardPrice(hero: HeroId, cost: number, fits: boolean, discountUsed: boolean) {
  if (hero === "infectologo" && fits && !discountUsed && cost > 0) return cost - 1;
  return cost;
}
