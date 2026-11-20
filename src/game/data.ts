import type { Assessment, CardDef, CardId, CaseDef, Ctx, Mechanism } from "./types";

export const ENERGY = 3;

export const MECHANISMS: Record<
  Mechanism,
  { label: string; short: string; idea: string; how: string; resist: string }
> = {
  pared: {
    label: "Pared celular",
    short: "Pared",
    idea: "La pared de peptidoglucano aguanta la presión interna. Las células humanas no la tienen: por eso este golpe es selectivo.",
    how: "Los β-lactámicos se parecen al extremo D-alanil-D-alanina y bloquean las PBP, que tejen los puentes. La vancomicina se pega directo a D-Ala-D-Ala. La fosfomicina frena a MurA, un paso anterior.",
    resist: "β-lactamasas, PBP2a (S. aureus resistente a meticilina) y, para la vancomicina, la membrana externa de los gramnegativos.",
  },
  proteina: {
    label: "Síntesis de proteínas",
    short: "Ribosoma",
    idea: "El ribosoma bacteriano es 70S (30S + 50S). El humano es 80S. Esa diferencia deja entrar al antibiótico con poco daño a tus proteínas.",
    how: "En 30S, los aminoglucósidos tuercen la lectura y las tetraciclinas cierran el sitio A. En 50S, macrólidos, clindamicina y cloranfenicol traban el péptido. El linezolid impide armar el complejo de inicio.",
    resist: "Metilación del ARNr (genes erm), mutación de la diana, enzimas que modifican aminoglucósidos y bombas de expulsión.",
  },
  acidos: {
    label: "Ácidos nucleicos",
    short: "ADN / ARN",
    idea: "Sin copiar el ADN o sin transcribir ARN, la bacteria no se multiplica. El corte mal cerrado termina en roturas de doble cadena.",
    how: "Las fluoroquinolonas congelan a la ADN girasa y a la topoisomerasa IV sobre el ADN ya cortado. La rifampicina tapa la subunidad β de la ARN polimerasa. El metronidazol, ya reducido en anaerobios, fragmenta el ADN.",
    resist: "Mutaciones en gyrA/gyrB y parC/parE, bombas de expulsión, genes qnr y mutaciones en rpoB.",
  },
  membrana: {
    label: "Membrana citoplasmática",
    short: "Membrana",
    idea: "La membrana guarda el interior y el gradiente que produce energía. Si se desarma, el contenido se va. Es un golpe rápido, y menos selectivo.",
    how: "Las polimixinas se pegan al LPS aniónico, desplazan calcio y magnesio y actúan como detergente. La daptomicina, con calcio, se inserta en grampositivos, deja salir potasio y apaga la síntesis.",
    resist: "El gen mcr-1 añade fosfoetanolamina al LPS y le quita la carga que atraía a la colistina.",
  },
  metabolica: {
    label: "Vía del ácido fólico",
    short: "Folato",
    idea: "La bacteria fabrica su folato para poder hacer purinas, timina y algunos aminoácidos. El humano lo saca de la dieta y por eso no usa esta vía.",
    how: "La sulfamida compite con el PABA en la dihidropteroato sintetasa. La trimetoprima bloquea la dihidrofolato reductasa, el paso siguiente. Juntas, en el cotrimoxazol, el bloqueo secuencial pasa de bacteriostático a bactericida.",
    resist: "Sobreproducción de PABA, enzimas con menos afinidad y genes sul y dfr.",
  },
};

export const TABLE: { mecanismo: string; diana: string; ejemplos: string; efecto: string }[] = [
  {
    mecanismo: "Pared celular",
    diana: "PBP y precursores del peptidoglucano",
    ejemplos: "β-lactámicos, vancomicina, fosfomicina",
    efecto: "Bactericida",
  },
  {
    mecanismo: "Síntesis de proteínas",
    diana: "Ribosoma 30S o 50S",
    ejemplos: "Aminoglucósidos, tetraciclinas, macrólidos, clindamicina, linezolid",
    efecto: "Casi siempre bacteriostático. Los aminoglucósidos son bactericidas.",
  },
  {
    mecanismo: "Ácidos nucleicos",
    diana: "ADN girasa, topoisomerasa IV, ARN polimerasa",
    ejemplos: "Fluoroquinolonas, rifampicina, metronidazol",
    efecto: "Bactericida",
  },
  {
    mecanismo: "Membrana",
    diana: "LPS y fosfolípidos",
    ejemplos: "Polimixinas, daptomicina",
    efecto: "Bactericida",
  },
  {
    mecanismo: "Vía del folato",
    diana: "Dihidropteroato sintetasa y dihidrofolato reductasa",
    ejemplos: "Sulfonamidas, trimetoprima",
    efecto: "Bacteriostático. Bactericida si van juntas.",
  },
];

const has = (ctx: Ctx, tag: string) => ctx.tags.includes(tag);

function ok(partial: {
  title: string;
  body: string;
  damage?: number;
  slow?: number;
  self?: number;
  addTags?: string[];
}): Assessment {
  return {
    fits: true,
    synergy: false,
    damage: 0,
    slow: 0,
    self: 0,
    addTags: [],
    ...partial,
  };
}

function no(title: string, body: string): Assessment {
  return { fits: false, synergy: false, damage: 0, slow: 0, self: 0, addTags: [], title, body };
}

function betaLactamGuard(ctx: Ctx): Assessment | null {
  if (has(ctx, "pbp2a")) {
    return no(
      "PBP2a",
      "Esta cepa fabrica PBP2a, una transpeptidasa que no reconoce al β-lactámico. La pared se sigue cerrando. La vancomicina esquiva ese problema: se une al precursor, no a la enzima.",
    );
  }
  if (has(ctx, "bla")) {
    return no(
      "Carbapenemasa",
      "Una β-lactamasa abre el anillo antes de que el fármaco llegue a la PBP. Aquí es una carbapenemasa: también anula al meropenem. Toca cambiar de mecanismo.",
    );
  }
  return null;
}

function folateBlock(ctx: Ctx): Assessment | null {
  if (has(ctx, "bacteroides")) {
    return no(
      "Absceso anaerobio",
      "Bacteroides fabrica folato, pero este absceso no se controla por esa vía. Hay que fragmentar el ADN con metronidazol o usar un β-lactámico que sí cubra anaerobios.",
    );
  }
  if (has(ctx, "sul") || has(ctx, "dfr")) {
    return no(
      "genes sul y dfr",
      "La bacteria sobreproduce PABA, cambió la enzima o trajo otra copia (genes sul y dfr). El bloqueo del folato, incluso el del cotrimoxazol, ya no cierra la vía.",
    );
  }
  return null;
}

export const CARDS: Record<CardId, CardDef> = {
  penicilina: {
    id: "penicilina",
    name: "Penicilina",
    family: "Beta-lactámico",
    mechanism: "pared",
    cost: 1,
    effect: "Bactericida",
    line: "Bloquea las PBP. Sin puentes, la pared cede.",
    when: "Grampositivos en crecimiento, sin β-lactamasa ni PBP2a.",
    baseDamage: 10,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = betaLactamGuard(ctx);
      if (blocked) return blocked;
      if (!has(ctx, "gram-positiva")) {
        return no(
          "Membrana externa",
          "La penicilina casi no cruza la membrana externa de los gramnegativos. Para ellos hace falta una cefalosporina, no la penicilina natural.",
        );
      }
      return ok({
        damage: 10,
        title: "Pared rota",
        body: "Se pega al sitio activo de las PBP e impide la transpeptidación. Sin enlaces cruzados, la presión interna lisa la bacteria. Tus células no tienen pared: esa es la selectividad.",
      });
    },
  },
  amoxicilina: {
    id: "amoxicilina",
    name: "Amoxicilina",
    family: "Beta-lactámico",
    mechanism: "pared",
    cost: 1,
    effect: "Bactericida",
    line: "La misma diana que la penicilina, con mejor entrada.",
    when: "Grampositivos y varios gramnegativos, si no hay β-lactamasa ni PBP2a.",
    baseDamage: 9,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = betaLactamGuard(ctx);
      if (blocked) return blocked;
      if (has(ctx, "bacteroides")) {
        return no("Anaerobio", "Amoxicilina no controla un absceso por Bacteroides.");
      }
      return ok({
        damage: 9,
        title: "PBP, también afuera",
        body: "Sigue bloqueando las PBP, y entra mejor que la penicilina en algunos gramnegativos. Una β-lactamasa le abre el anillo y la deja inútil.",
      });
    },
  },
  ceftriaxona: {
    id: "ceftriaxona",
    name: "Ceftriaxona",
    family: "Cefalosporina",
    mechanism: "pared",
    cost: 2,
    effect: "Bactericida",
    line: "β-lactámico capaz de cruzar la membrana externa.",
    when: "Grampositivos y gramnegativos. No cubre Bacteroides, PBP2a ni carbapenemasa.",
    baseDamage: 13,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = betaLactamGuard(ctx);
      if (blocked) return blocked;
      if (has(ctx, "bacteroides")) {
        return no(
          "Sin cobertura anaerobia",
          "Ceftriaxona no cubre bien Bacteroides. En el absceso se usa metronidazol o un carbapenémico.",
        );
      }
      return ok({
        damage: 13,
        title: "Pared del gramnegativo",
        body: "También bloquea las PBP. A diferencia de la penicilina, atraviesa la membrana externa de muchos gramnegativos y por eso sirve en esta infección.",
      });
    },
  },
  meropenem: {
    id: "meropenem",
    name: "Meropenem",
    family: "Carbapenémico",
    mechanism: "pared",
    cost: 2,
    effect: "Bactericida",
    line: "Llega a la pared de aerobios y de anaerobios.",
    when: "Cobertura amplia, incluidos anaerobios. Cae ante PBP2a y ante una carbapenemasa.",
    baseDamage: 15,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = betaLactamGuard(ctx);
      if (blocked) return blocked;
      return ok({
        damage: 15,
        title: "Carbapenémico",
        body: "Bloquea PBP en grampositivos, gramnegativos y anaerobios. No reconoce una PBP2a y no sobrevive a una carbapenemasa.",
      });
    },
  },
  vancomicina: {
    id: "vancomicina",
    name: "Vancomicina",
    family: "Glucopéptido",
    mechanism: "pared",
    cost: 2,
    effect: "Bactericida",
    line: "Se une a D-Ala-D-Ala, antes de la PBP.",
    when: "Grampositivos, incluso con PBP2a. No cruza la membrana externa.",
    baseDamage: 14,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "gram-negativa")) {
        return no(
          "Demasiado grande",
          "La vancomicina reconoce D-Ala-D-Ala, pero no atraviesa la membrana externa. En un gramnegativo ni siquiera llega a la pared.",
        );
      }
      return ok({
        damage: 14,
        title: "Precursor atrapado",
        body: "No usa las PBP. Se pega al extremo D-Ala-D-Ala y las enzimas no pueden meter ese ladrillo en la pared. Por eso sigue sirviendo cuando la PBP2a ya cambió.",
      });
    },
  },
  fosfomicina: {
    id: "fosfomicina",
    name: "Fosfomicina",
    family: "Pared temprana",
    mechanism: "pared",
    cost: 1,
    effect: "Bactericida",
    line: "Inhibe MurA, antes de que exista el peptidoglucano.",
    when: "Bacterias con pared, aunque tengan β-lactamasa o PBP2a. No trata el absceso anaerobio.",
    baseDamage: 9,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "bacteroides")) {
        return no("Foco", "Fosfomicina frena a MurA, pero no es el tratamiento de un absceso anaerobio.");
      }
      return ok({
        damage: 9,
        title: "MurA",
        body: "Corta un paso temprano de la síntesis del precursor. No es un β-lactámico: ni la β-lactamasa ni la PBP2a la detienen.",
      });
    },
  },
  gentamicina: {
    id: "gentamicina",
    name: "Gentamicina",
    family: "Aminoglucósido",
    mechanism: "proteina",
    cost: 2,
    effect: "Bactericida",
    line: "Se une al ARNr 16S y la proteína sale mal hecha.",
    when: "Bacterias aerobias. Casi no entra si no hay oxígeno.",
    baseDamage: 12,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "anaerobio")) {
        return no(
          "Sin oxígeno",
          "El aminoglucósido entra por un transporte que gasta oxígeno y energía. En un anaerobio casi no alcanza el ribosoma 30S.",
        );
      }
      if (has(ctx, "pbp2a")) {
        return ok({
          damage: 5,
          title: "30S, golpe corto",
          body: "Llega al ARNr 16S y mete errores en la proteína, pero en este S. aureus resistente un aminoglucósido solo no controla la infección. El eje es vancomicina o linezolid.",
        });
      }
      return ok({
        damage: 12,
        title: "Lectura errónea",
        body: "Se fija al ARNr 16S de la subunidad 30S, fuerza codones mal leídos y también frena el inicio. Es bactericida, y por eso se siente distinto de una tetraciclina.",
      });
    },
  },
  amikacina: {
    id: "amikacina",
    name: "Amikacina",
    family: "Aminoglucósido",
    mechanism: "proteina",
    cost: 2,
    effect: "Bactericida",
    line: "Otro 30S, más firme frente a enzimas modificadoras.",
    when: "Aerobios, incluidos varios gramnegativos resistentes. Inútil en anaerobios.",
    baseDamage: 14,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "anaerobio")) {
        return no(
          "Sin oxígeno",
          "Amikacina también necesita el transporte dependiente de oxígeno. En el anaerobio no llega a la subunidad 30S.",
        );
      }
      if (has(ctx, "pbp2a")) {
        return ok({
          damage: 6,
          title: "30S, todavía corto",
          body: "Resiste mejor algunas enzimas que inactivan aminoglucósidos, pero aquí no sustituye a un fármaco de pared o al linezolid.",
        });
      }
      return ok({
        damage: 14,
        title: "30S protegido",
        body: "Se une al ribosoma 30S y provoca proteínas anómalas. Aguanta mejor que la gentamicina ciertas enzimas modificadoras. Sigue sin servir donde no hay oxígeno.",
      });
    },
  },
  doxiciclina: {
    id: "doxiciclina",
    name: "Doxiciclina",
    family: "Tetraciclina",
    mechanism: "proteina",
    cost: 1,
    effect: "Bacteriostático",
    line: "Cierra el sitio A. La cadena de proteína se detiene.",
    when: "Frena el ataque. No es el tratamiento del absceso ni el eje contra MRSA.",
    baseDamage: 4,
    baseSlow: 5,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "bacteroides")) {
        return no(
          "Foco",
          "La doxiciclina impide la entrada del aminoacil-ARNt al sitio A, pero no controla este absceso anaerobio.",
        );
      }
      if (has(ctx, "pbp2a")) {
        return ok({
          damage: 4,
          slow: 3,
          title: "Solo frena",
          body: "Ocupa el sitio A del ribosoma 30S y la bacteria pega un poco menos. En este S. aureus no reemplaza a la vancomicina ni al linezolid.",
        });
      }
      return ok({
        damage: 4,
        slow: 5,
        title: "Sitio A cerrado",
        body: "El aminoacil-ARNt no entra y la proteína no crece. Es bacteriostática: no deshace la pared, le baja el ataque a la bacteria para que el paciente aguante.",
      });
    },
  },
  claritromicina: {
    id: "claritromicina",
    name: "Claritromicina",
    family: "Macrólido",
    mechanism: "proteina",
    cost: 1,
    effect: "Bacteriostático",
    line: "Se sienta a la salida del ribosoma 50S.",
    when: "Grampositivos sin metilación erm. Entra mal en gramnegativos.",
    baseDamage: 3,
    baseSlow: 7,
    selfDamage: 0,
    resolve(ctx) {
      if (!has(ctx, "gram-positiva")) {
        return no(
          "No entra",
          "El macrólido se coloca junto al túnel de salida del péptido, pero entra mal en la mayoría de los gramnegativos.",
        );
      }
      if (has(ctx, "erm")) {
        return no(
          "gen erm",
          "Una metilasa modifica el ARNr 23S y el macrólido pierde el sitio. Es una resistencia clásica de Staphylococcus.",
        );
      }
      return ok({
        damage: 3,
        slow: 7,
        title: "Túnel bloqueado",
        body: "Trabó la translocación en la subunidad 50S. La cadena no avanza. Es bacteriostática: este turno la bacteria ataca mucho menos.",
      });
    },
  },
  clindamicina: {
    id: "clindamicina",
    name: "Clindamicina",
    family: "Lincosamida",
    mechanism: "proteina",
    cost: 1,
    effect: "Bacteriostático",
    line: "Frena el enlace peptídico en el 50S.",
    when: "Grampositivos y anaerobios, si el gen erm no metiló el ARNr.",
    baseDamage: 7,
    baseSlow: 4,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "erm")) {
        return no(
          "gen erm",
          "La misma metilación del ARNr 23S deja fuera a la clindamicina. El linezolid usa otro sitio y por eso todavía entra.",
        );
      }
      if (!(has(ctx, "gram-positiva") || has(ctx, "anaerobio"))) {
        return no(
          "Cobertura",
          "La clindamicina actúa en grampositivos y en anaerobios. Este gramnegativo aerobio queda fuera.",
        );
      }
      return ok({
        damage: 7,
        slow: 4,
        title: "Peptidiltransferasa",
        body: "Impide formar el enlace peptídico y seguir la translocación. En un anaerobio, o en un grampositivo sensible, el ribosoma se detiene.",
      });
    },
  },
  linezolid: {
    id: "linezolid",
    name: "Linezolid",
    family: "Oxazolidinona",
    mechanism: "proteina",
    cost: 2,
    effect: "Bacteriostático",
    line: "Impide armar el ribosoma que va a empezar la proteína.",
    when: "Grampositivos, incluido MRSA. El gen erm no lo cubre.",
    baseDamage: 8,
    baseSlow: 4,
    selfDamage: 0,
    resolve(ctx) {
      if (!has(ctx, "gram-positiva")) {
        return no(
          "Grampositivo",
          "El linezolid impide el complejo de iniciación 70S. Su campo son los grampositivos, también los que ya cambiaron la PBP.",
        );
      }
      return ok({
        damage: 8,
        slow: 4,
        title: "Inicio 70S",
        body: "No deja que se arme el ribosoma para empezar la proteína. Es bacteriostático, como casi todos los de esta diana, pero su sitio es distinto al de macrólidos y lincosamidas: el gen erm no lo apaga.",
      });
    },
  },
  ciprofloxacino: {
    id: "ciprofloxacino",
    name: "Ciprofloxacino",
    family: "Fluoroquinolona",
    mechanism: "acidos",
    cost: 2,
    effect: "Bactericida",
    line: "Congela a la ADN girasa con el ADN ya cortado.",
    when: "Aerobios con ADN girasa accesible. Falla en Bacteroides y en MRSA. Las bombas lo debilitan.",
    baseDamage: 14,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "bacteroides")) {
        return no(
          "Anaerobio",
          "Las fluoroquinolonas no son fiables contra Bacteroides. Aquí el ADN se ataca con metronidazol, que sí se activa en anaerobiosis.",
        );
      }
      if (has(ctx, "mrsa")) {
        return no(
          "No es su tratamiento",
          "La ciprofloxacina no es fiable contra S. aureus resistente a la meticilina. La diana de este caso está en la pared o en otro punto del ribosoma.",
        );
      }
      if (has(ctx, "efflux")) {
        return ok({
          damage: 7,
          title: "Llega a medias",
          body: "La ADN girasa sigue siendo la diana, pero las bombas de expulsión sacan parte del fármaco. El corte ocurre menos veces y el daño cae a la mitad.",
        });
      }
      return ok({
        damage: 14,
        title: "Doble cadena",
        body: "Estabiliza el complejo de la ADN girasa con el ADN cortado. Esas roturas no se vuelven a cerrar y la bacteria muere. Es bactericida y depende de la concentración.",
      });
    },
  },
  rifampicina: {
    id: "rifampicina",
    name: "Rifampicina",
    family: "Rifamicina",
    mechanism: "acidos",
    cost: 1,
    effect: "Bactericida",
    line: "Tapa la ARN polimerasa. La resistencia aparece rápido.",
    when: "Un golpe a la transcripción. Si se usa sola, rpoB cambia y la segunda dosis ya no entra.",
    baseDamage: 10,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (has(ctx, "rpoB")) {
        return no(
          "rpoB",
          "La subunidad β de la ARN polimerasa ya mutó. Por eso la rifampicina no se deja sola: la resistencia se selecciona enseguida.",
        );
      }
      return ok({
        damage: 10,
        addTags: ["rpoB"],
        title: "Transcripción cerrada",
        body: "Se une a la subunidad β de la ARN polimerasa bacteriana y no deja salir el ARN mensajero. Sirve esta vez. La próxima, esta misma bacteria ya habrá cambiado rpoB.",
      });
    },
  },
  metronidazol: {
    id: "metronidazol",
    name: "Metronidazol",
    family: "Nitroimidazol",
    mechanism: "acidos",
    cost: 1,
    effect: "Bactericida",
    line: "Profármaco: solo el anaerobio lo enciende.",
    when: "Únicamente anaerobios. Ahí los radicales fragmentan el ADN.",
    baseDamage: 20,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (!has(ctx, "anaerobio")) {
        return no(
          "Profármaco apagado",
          "Metronidazol tiene que reducirse dentro de la bacteria. Solo los anaerobios hacen esa reacción y liberan los radicales que rompen el ADN. Aquí no se activa.",
        );
      }
      return ok({
        damage: 20,
        title: "ADN en pedazos",
        body: "El anaerobio lo reduce y aparecen radicales libres que fragmentan el ADN. Fuera de ese ambiente la molécula casi no hace nada. Por eso esta carta es la del absceso.",
      });
    },
  },
  colistina: {
    id: "colistina",
    name: "Colistina",
    family: "Polimixina",
    mechanism: "membrana",
    cost: 2,
    effect: "Bactericida",
    line: "Se ancla al LPS y desarma la membrana. Tóxico.",
    when: "Gramnegativos con LPS cargado. Falla con mcr-1 y no cubre anaerobios. Resta estabilidad al paciente.",
    baseDamage: 14,
    baseSlow: 0,
    selfDamage: 5,
    resolve(ctx) {
      if (!has(ctx, "lps")) {
        return no(
          "Sin LPS",
          "La colistina es catiónica y busca los fosfatos negativos del lipopolisacárido. Esta bacteria no tiene esa membrana externa.",
        );
      }
      if (has(ctx, "bacteroides")) {
        return no("Anaerobio", "Aunque hay LPS, las polimixinas no cubren anaerobios.");
      }
      if (has(ctx, "mcr1")) {
        return no(
          "mcr-1",
          "El gen mcr-1 añade fosfoetanolamina al LPS. Baja la carga negativa y la colistina ya no se ancla. La membrana dejó de ser su diana.",
        );
      }
      return ok({
        damage: 14,
        self: 5,
        title: "Membrana abierta",
        body: "Desplaza calcio y magnesio, entra en la membrana y el contenido se escapa, como un detergente. También puede tocar membranas humanas: de ahí la nefrotoxicidad y la neurotoxicidad. El paciente pierde estabilidad.",
      });
    },
  },
  daptomicina: {
    id: "daptomicina",
    name: "Daptomicina",
    family: "Lipopéptido",
    mechanism: "membrana",
    cost: 2,
    effect: "Bactericida",
    line: "Con calcio, perfora la membrana del grampositivo.",
    when: "Grampositivos, incluido MRSA. No actúa sobre el LPS. El surfactante pulmonar la inactiva.",
    baseDamage: 13,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      if (!has(ctx, "gram-positiva")) {
        return no(
          "Otra membrana",
          "La daptomicina se inserta en la membrana del grampositivo. No usa el LPS, así que un gramnegativo ni la siente.",
        );
      }
      return ok({
        damage: 13,
        title: "Sale el potasio",
        body: "En presencia de calcio se inserta, forma agregados y despolariza la membrana. Se detiene la síntesis de ADN, ARN y proteínas. No se usa en neumonía: el surfactante la apaga.",
      });
    },
  },
  sulfametoxazol: {
    id: "sulfametoxazol",
    name: "Sulfametoxazol",
    family: "Sulfonamida",
    mechanism: "metabolica",
    cost: 1,
    effect: "Bacteriostático",
    line: "Imita al PABA y frena el primer paso del folato.",
    when: "Bacterias que fabrican folato. Sola frena. Con trimetoprima en el mismo turno, mata.",
    baseDamage: 4,
    baseSlow: 2,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = folateBlock(ctx);
      if (blocked) return blocked;
      return ok({
        damage: 4,
        slow: 2,
        title: "Paso uno del folato",
        body: "Compite con el ácido para-aminobenzoico en la dihidropteroato sintetasa. Sola es bacteriostática. Si en este mismo turno juegas trimetoprima, los dos pasos quedan cerrados y el efecto pasa a bactericida.",
      });
    },
  },
  trimetoprima: {
    id: "trimetoprima",
    name: "Trimetoprima",
    family: "Antimetabolito",
    mechanism: "metabolica",
    cost: 1,
    effect: "Bacteriostático",
    line: "Bloquea el paso que activa el folato.",
    when: "El segundo eslabón. Junto con sulfametoxazol, en el mismo turno, es el cotrimoxazol.",
    baseDamage: 4,
    baseSlow: 2,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = folateBlock(ctx);
      if (blocked) return blocked;
      return ok({
        damage: 4,
        slow: 2,
        title: "Paso dos del folato",
        body: "Inhibe la dihidrofolato reductasa, la enzima que convierte dihidrofolato en la forma activa. Sola frena. Con sulfametoxazol en el mismo turno aparece la sinergia.",
      });
    },
  },
  cotrimoxazol: {
    id: "cotrimoxazol",
    name: "Cotrimoxazol",
    family: "Combinación",
    mechanism: "metabolica",
    cost: 2,
    effect: "Bactericida en combo",
    line: "Los dos pasos del folato, en una sola carta.",
    when: "Cuando la vía del folato está intacta. No salva un absceso anaerobio ni una resistencia sul/dfr.",
    baseDamage: 18,
    baseSlow: 0,
    selfDamage: 0,
    resolve(ctx) {
      const blocked = folateBlock(ctx);
      if (blocked) return blocked;
      return ok({
        damage: 18,
        title: "Bloqueo secuencial",
        body: "Trae los dos fármacos: sulfametoxazol cierra la dihidropteroato sintetasa y trimetoprima la dihidrofolato reductasa. El efecto conjunto es sinérgico y pasa a bactericida. El humano no fabrica folato, lo toma de la dieta.",
      });
    },
  },
};

export function assess(id: CardId, ctx: Ctx): Assessment {
  const raw = CARDS[id].resolve(ctx);
  if (!raw.fits) return raw;
  if (id !== "sulfametoxazol" && id !== "trimetoprima") return raw;
  if (has(ctx, "sul") || has(ctx, "dfr") || has(ctx, "bacteroides")) return raw;
  const played = ctx.playedThisTurn;
  if (played.includes("sulfametoxazol") && played.includes("trimetoprima")) {
    return {
      ...raw,
      damage: raw.damage + 14,
      slow: 0,
      synergy: true,
      title: "Bloqueo secuencial",
      body: "Sulfametoxazol cierra la dihidropteroato sintetasa y trimetoprima la dihidrofolato reductasa. Son dos pasos seguidos de la misma vía: juntas dejan de ser solo bacteriostáticas y el efecto pasa a bactericida.",
    };
  }
  return raw;
}

export const STARTER: CardId[] = [
  "penicilina",
  "ceftriaxona",
  "vancomicina",
  "gentamicina",
  "doxiciclina",
  "ciprofloxacino",
  "metronidazol",
  "colistina",
  "sulfametoxazol",
  "trimetoprima",
];

export const CASES: CaseDef[] = [
  {
    id: "pyogenes",
    bed: "12",
    title: "Faringoamigdalitis",
    bacteria: "Streptococcus pyogenes",
    sprite: "/sprites/pyogenes.png",
    photo: "/micro/pyogenes.png",
    credit: "NIAID, CC BY 2.0",
    shape: "cadena",
    gram: "pos",
    hp: 40,
    attack: 5,
    patient: 36,
    tags: ["gram-positiva", "aerobia", "creciendo", "pared", "ribosoma", "adn", "arn", "folato"],
    ensure: ["penicilina"],
    traits: [
      { label: "Grampositiva", detail: "Pared gruesa, sin membrana externa.", tone: "ok" },
      { label: "En crecimiento", detail: "Los β-lactámicos actúan mientras la pared se está construyendo.", tone: "ok" },
      { label: "Sin resistencia", detail: "No hay β-lactamasa ni PBP modificada.", tone: "ok" },
    ],
    banner: "Streptococcus pyogenes, Gram positivo. La diana es la pared de peptidoglucano. Busca un β-lactámico.",
    objectiveTitle: "Empieza por la pared",
    objective:
      "Esta bacteria está creciendo y su peptidoglucano está intacto. Una carta de pared bactericida debería bastar. Las que dependen de LPS o de anaerobiosis van a resistir, y el panel te va a decir por qué.",
    winLine: "La infección cedió. El antibiótico encontró una estructura que esta bacteria todavía tenía abierta.",
    lessonTitle: "Selectividad de la pared",
    lessonPoints: [
      "El peptidoglucano, hecho de NAG y NAM unidos por puentes, no existe en la célula humana. Por eso un β-lactámico puede ser tan selectivo.",
      "Las PBP son transpeptidasas. El antibiótico imita a D-alanil-D-alanina, se une a su sitio activo y la pared queda sin enlaces cruzados.",
      "El golpe es bactericida y necesita una bacteria en crecimiento. Si la pared ya no se está construyendo, no hay nada que interrumpir.",
    ],
    phases: [],
    reward: ["amoxicilina", "fosfomicina", "claritromicina"],
    nextHint:
      "Lo que viene: Escherichia coli, un gramnegativo. La vancomicina no cruza su membrana externa. El folato, en cambio, sí se puede bloquear.",
  },
  {
    id: "ecoli",
    bed: "04",
    title: "Cistitis",
    bacteria: "Escherichia coli",
    sprite: "/sprites/ecoli.png",
    photo: "/micro/ecoli.png",
    credit: "USDA, dominio público",
    shape: "bacilo",
    gram: "neg",
    flagella: true,
    hp: 54,
    attack: 6,
    patient: 40,
    tags: ["gram-negativa", "aerobia", "creciendo", "pared", "ribosoma", "adn", "arn", "lps", "folato"],
    ensure: ["trimetoprima", "sulfametoxazol"],
    traits: [
      { label: "Gramnegativa", detail: "Tiene membrana externa y LPS. La vancomicina no pasa.", tone: "warn" },
      { label: "Aerobia", detail: "Los aminoglucósidos pueden entrar.", tone: "ok" },
      { label: "Fabrica folato", detail: "Los dos pasos de la vía están abiertos.", tone: "ok" },
    ],
    banner: "Escherichia coli, Gram negativo. La penicilina no cruza la membrana externa. El folato sí se puede bloquear.",
    objectiveTitle: "Otra puerta de entrada",
    objective:
      "La penicilina y la vancomicina se quedan afuera. Ceftriaxona, el ribosoma, el ADN o la membrana sí tienen camino. Si juegas sulfametoxazol y trimetoprima en el mismo turno, el bloqueo se vuelve bactericida.",
    winLine: "La infección urinaria cedió cuando el fármaco por fin llegó a un sitio que esta bacteria sí tenía.",
    lessonTitle: "No toda diana se puede alcanzar",
    lessonPoints: [
      "La vancomicina reconoce la pared, pero es demasiado grande para la membrana externa. Tener la diana no alcanza: el fármaco tiene que llegar.",
      "Sulfametoxazol compite con el PABA. Trimetoprima bloquea la dihidrofolato reductasa. Son dos pasos consecutivos.",
      "Por separado son bacteriostáticos. Juntos, el cotrimoxazol, el efecto es sinérgico y pasa a bactericida. El humano obtiene el folato de la dieta.",
    ],
    phases: [],
    reward: ["meropenem", "clindamicina", "cotrimoxazol"],
    nextHint:
      "Lo que viene: un anaerobio dentro de un absceso. El metronidazol se activa ahí. La gentamicina, sin oxígeno, no entra.",
  },
  {
    id: "fragilis",
    bed: "07",
    title: "Absceso abdominal",
    bacteria: "Bacteroides fragilis",
    sprite: "/sprites/fragilis.png",
    photo: "/micro/fragilis.png",
    credit: "CDC, dominio público",
    shape: "bacilo",
    gram: "neg",
    hp: 40,
    attack: 4,
    patient: 40,
    tags: [
      "gram-negativa",
      "anaerobio",
      "bacteroides",
      "creciendo",
      "pared",
      "ribosoma",
      "adn",
      "arn",
      "lps",
      "folato",
    ],
    ensure: ["metronidazol"],
    traits: [
      { label: "Anaerobio estricto", detail: "Reduce el metronidazol y lo convierte en el fármaco activo.", tone: "ok" },
      { label: "Sin oxígeno", detail: "El transporte de los aminoglucósidos está apagado.", tone: "bad" },
      { label: "Absceso", detail: "Varias cartas de otras dianas no cubren este foco, aunque el mecanismo exista.", tone: "warn" },
    ],
    banner: "Bacteroides fragilis, anaerobio. El metronidazol es un profármaco: solo se activa en este foco.",
    objectiveTitle: "Hay que encender el profármaco",
    objective:
      "Casi todo el mazo va a marcar que no encaja. Está bien: este caso tiene una carta justa. Metronidazol solo se activa cuando la bacteria lo reduce, y eso lo hacen los anaerobios.",
    winLine: "El ADN del anaerobio quedó fragmentado. El profármaco solo se encendió aquí.",
    lessonTitle: "El lugar también es parte del mecanismo",
    lessonPoints: [
      "Metronidazol es un profármaco. En el anaerobio se reduce y forma radicales libres que rompen el ADN.",
      "Los aminoglucósidos necesitan un transporte dependiente de oxígeno. En este absceso la gentamicina no llega al 30S.",
      "Que una vía exista en la bacteria no significa que ese fármaco sirva para ese foco. La cobertura clínica también se estudia.",
    ],
    phases: [],
    reward: ["linezolid", "daptomicina", "rifampicina"],
    nextHint:
      "Lo que viene: Staphylococcus aureus con PBP2a. Los β-lactámicos dejan de encajar en la enzima. La vancomicina se une a otra cosa.",
  },
  {
    id: "mrsa",
    bed: "09",
    title: "Celulitis",
    bacteria: "Staphylococcus aureus",
    sprite: "/sprites/mrsa.png",
    photo: "/micro/mrsa.png",
    credit: "CDC, dominio público",
    shape: "racimo",
    gram: "pos",
    hp: 64,
    attack: 7,
    patient: 42,
    tags: [
      "gram-positiva",
      "aerobia",
      "creciendo",
      "pared",
      "ribosoma",
      "adn",
      "arn",
      "folato",
      "pbp2a",
      "erm",
      "mrsa",
    ],
    ensure: ["vancomicina"],
    traits: [
      { label: "PBP2a", detail: "La transpeptidasa ya no reconoce β-lactámicos.", tone: "bad" },
      { label: "gen erm", detail: "El ARNr 23S está metilado. Caen macrólidos y lincosamidas.", tone: "bad" },
      { label: "D-Ala-D-Ala intacto", detail: "La vancomicina todavía encuentra el precursor.", tone: "ok" },
    ],
    banner: "Staphylococcus aureus con PBP2a. Los β-lactámicos usuales no reconocen esa proteína. Busca vancomicina.",
    objectiveTitle: "La enzima ya no es la misma",
    objective:
      "Penicilinas, cefalosporinas y carbapenémicos van a rebotar: la PBP2a no los reconoce. Busca una carta que no use esa enzima. Vancomicina, linezolid o daptomicina cuentan esa historia.",
    winLine: "La infección de piel cedió por un sitio que la PBP2a no podía esconder.",
    lessonTitle: "Cuando la diana cambia de forma",
    lessonPoints: [
      "MRSA fabrica PBP2a. El β-lactámico ya no encaja en el sitio activo y la transpeptidación sigue, aunque la pared exista.",
      "La vancomicina no necesita esa enzima: se une directamente a D-Ala-D-Ala del precursor.",
      "El gen erm metila el ARNr y esconde el sitio de macrólidos y clindamicina. El linezolid inicia el ribosoma por otro lado, y por eso sigue activo.",
    ],
    phases: [],
    reward: ["amikacina", "fosfomicina", "doxiciclina"],
    nextHint:
      "Lo que viene: Klebsiella con carbapenemasa. Los β-lactámicos, meropenem incluido, ya están cerrados. Prepara ribosoma, ADN o membrana.",
  },
  {
    id: "klebsiella",
    bed: "02",
    title: "Sepsis",
    bacteria: "Klebsiella pneumoniae",
    sprite: "/sprites/klebsiella.png",
    photo: "/micro/klebsiella.png",
    credit: "NIAID, CC BY 2.0",
    shape: "bacilo",
    gram: "neg",
    capsule: true,
    hp: 78,
    attack: 8,
    patient: 54,
    tags: [
      "gram-negativa",
      "aerobia",
      "creciendo",
      "pared",
      "ribosoma",
      "adn",
      "arn",
      "lps",
      "folato",
      "bla",
      "sul",
      "dfr",
    ],
    ensure: ["gentamicina"],
    traits: [
      { id: "bla", label: "Carbapenemasa", detail: "Abre el anillo de todos los β-lactámicos del mazo.", tone: "bad" },
      { id: "folato", label: "sul y dfr", detail: "El cotrimoxazol ya no cierra la vía del folato.", tone: "bad" },
      {
        id: "lps",
        label: "LPS todavía sensible",
        detail: "La colistina puede entrar, hasta que aparezca mcr-1.",
        tone: "warn",
      },
      {
        id: "adn",
        label: "ADN girasa abierta",
        detail: "La quinolona funciona mientras no dominen las bombas.",
        tone: "ok",
      },
    ],
    banner: "Klebsiella pneumoniae. El peptidoglucano de los β-lactámicos y el folato ya están cerrados. Cambie de diana.",
    objectiveTitle: "Varias puertas, ninguna para siempre",
    objective:
      "Esta Klebsiella ya trae carbapenemasa y resistencia al folato. Gentamicina, ciprofloxacino, fosfomicina y colistina todavía tienen diana. En el turno 3 puede aparecer mcr-1. En el 4, bombas de expulsión. No guardes la colistina para el final.",
    winLine: "La sepsis se contuvo cambiando de mecanismo cada vez que una resistencia cerraba el anterior.",
    lessonTitle: "La resistencia obliga a cambiar de mecanismo",
    lessonPoints: [
      "Una carbapenemasa no se vence con otro β-lactámico del mismo mazo. Hay que salir de esa diana.",
      "mcr-1 modifica el LPS con fosfoetanolamina. Sin la carga negativa, la colistina no se ancla y además ya se pagó su toxicidad potencial.",
      "Las bombas de expulsión no cambian la ADN girasa: simplemente no dejan que la quinolona se quede adentro. El daño baja, no desaparece la diana.",
    ],
    phases: [
      {
        turn: 3,
        add: ["mcr1"],
        attackPlus: 1,
        banner:
          "Apareció mcr-1. El LPS ganó fosfoetanolamina, perdió carga negativa y la colistina ya no se ancla.",
      },
      {
        turn: 4,
        add: ["efflux"],
        banner: "Bombas de expulsión activas. La ciprofloxacina entra, pero una parte vuelve a salir.",
      },
    ],
    nextHint: "",
  },
];
